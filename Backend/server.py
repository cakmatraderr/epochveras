import os
import uuid
import json
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from pywebpush import webpush, WebPushException

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

try:
    from backend.clerk_auth import clerk_router, require_user, verify_session_token
    from backend.market import router as market_router, last_prices
    from backend.alarms import Hub, AlarmEngine
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user, verify_session_token
    from market import router as market_router, last_prices
    from alarms import Hub, AlarmEngine

logging.basicConfig(level=logging.INFO)
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
app = FastAPI()
api = APIRouter(prefix="/api")
hub = Hub()
engine = AlarmEngine(db, hub)

SETTING_KEYS = {"layout", "favorites", "drawing_styles", "indicators", "last_symbol", "last_tf", "sound"}


def now():
    return datetime.now(timezone.utc).isoformat()


async def send_web_push(user_id: str, title: str, body: str):
    """Kullanıcının veritabanındaki tüm aktif push abonelerine web push bildirimi gönderir."""
    subs = await db.push_subs.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    if not subs:
        return

    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")
    vapid_claim_email = os.environ.get("VAPID_CLAIM_EMAIL", "mailto:admin@epochveras.com")

    if not vapid_private_key:
        return

    payload = json.dumps({"title": title, "body": body})

    for sub in subs:
        subscription_info = sub.get("subscription")
        if not subscription_info:
            continue
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": vapid_claim_email}
            )
        except WebPushException as ex:
            if ex.response and ex.response.status_code in [404, 410]:
                await db.push_subs.delete_one({"endpoint": subscription_info.get("endpoint")})


class Point(BaseModel):
    time: float
    price: float


class Drawing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    type: str
    points: List[Point]
    style: Dict[str, Any] = {}


class AlarmIn(BaseModel):
    symbol: str
    price: float
    price_str: Optional[str] = None


class PushSub(BaseModel):
    subscription: Dict[str, Any]


@api.get("/")
async def root():
    return {"app": "Epochveras", "ok": True}


@api.get("/settings")
async def get_settings(user=Depends(require_user)):
    doc = await db.settings.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    return {k: doc.get(k) for k in SETTING_KEYS}


@api.patch("/settings")
async def patch_settings(body: Dict[str, Any], user=Depends(require_user), x_client_id: str = Header(default="")):
    upd = {k: v for k, v in body.items() if k in SETTING_KEYS}
    if not upd:
        raise HTTPException(400, "No valid keys")
    await db.settings.update_one({"user_id": user["user_id"]}, {"$set": {**upd, "updated_at": now()}}, upsert=True)
    await hub.send(user["user_id"], {"type": "settings", "keys": list(upd)}, exclude=x_client_id)
    return {"ok": True}


@api.get("/drawings")
async def list_drawings(symbol: str, user=Depends(require_user)):
    return await db.drawings.find({"user_id": user["user_id"], "symbol": symbol.upper()}, {"_id": 0, "user_id": 0}).to_list(2000)


@api.put("/drawings/{did}")
async def upsert_drawing(did: str, d: Drawing, user=Depends(require_user), x_client_id: str = Header(default="")):
    doc = {**d.model_dump(), "id": did, "symbol": d.symbol.upper()}
    other = await db.drawings.find_one({"id": did}, {"_id": 0, "user_id": 1})
    if other and other["user_id"] != user["user_id"]:
        raise HTTPException(403, "Not allowed")
    await db.drawings.update_one({"id": did, "user_id": user["user_id"]},
                                   {"$set": {**doc, "updated_at": now()}, "$setOnInsert": {"user_id": user["user_id"]}}, upsert=True)
    await hub.send(user["user_id"], {"type": "drawing_upsert", "drawing": doc}, exclude=x_client_id)
    return doc


@api.delete("/drawings/{did}")
async def delete_drawing(did: str, user=Depends(require_user), x_client_id: str = Header(default="")):
    d = await db.drawings.find_one_and_delete({"id": did, "user_id": user["user_id"]})
    if not d:
        raise HTTPException(404, "Not found")
    await hub.send(user["user_id"], {"type": "drawing_delete", "id": did, "symbol": d["symbol"]}, exclude=x_client_id)
    return {"ok": True}


@api.get("/alarms")
async def list_alarms(user=Depends(require_user)):
    return await db.alarms.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/alarms")
async def create_alarm(a: AlarmIn, user=Depends(require_user)):
    sym = a.symbol.upper()
    cur = engine.prices.get(sym) if engine.ws and sym in engine.subscribed else None
    if cur is None:
        cur = (await last_prices()).get(sym)
    if cur is None:
        raise HTTPException(400, "Unknown symbol")
    if a.price <= 0:
        raise HTTPException(400, "Invalid price")
    doc = {"id": str(uuid.uuid4()), "user_id": user["user_id"], "symbol": sym, "price": a.price,
            "price_str": a.price_str or str(a.price), "direction": "up" if a.price > cur else "down",
            "created_price": cur, "type": "last_price", "status": "active", "created_at": now()}
    await db.alarms.insert_one({**doc})
    engine.add(doc)
    await hub.send(user["user_id"], {"type": "alarms"})
    return doc


@api.delete("/alarms/{aid}")
async def delete_alarm(aid: str, user=Depends(require_user)):
    a = await db.alarms.find_one_and_delete({"id": aid, "user_id": user["user_id"]}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Not found")
    engine.remove(a)
    await hub.send(user["user_id"], {"type": "alarms"})
    return {"ok": True}


@api.delete("/alarms")
async def clear_triggered(user=Depends(require_user)):
    await db.alarms.delete_many({"user_id": user["user_id"], "status": "triggered"})
    await hub.send(user["user_id"], {"type": "alarms"})
    return {"ok": True}


@api.get("/push/vapid")
async def vapid():
    return {"key": os.environ["VAPID_PUBLIC_KEY"]}


@api.post("/push/subscribe")
async def subscribe(body: PushSub, user=Depends(require_user)):
    ep = body.subscription.get("endpoint")
    if not ep:
        raise HTTPException(400, "Invalid subscription")
    await db.push_subs.update_one({"endpoint": ep}, {"$set": {"endpoint": ep, "user_id": user["user_id"],
                                    "subscription": body.subscription, "updated_at": now()}}, upsert=True)
    return {"ok": True}


@api.post("/push/test")
async def push_test(user=Depends(require_user)):
    await engine.push(user["user_id"], {"title": "Epochveras", "body": "Push bildirimleri aktif", "tag": "test"})
    return {"ok": True}


@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket, token: str = "", client_id: str = ""):
    try:
        uid = verify_session_token(token)["sub"]
    except Exception:
        await ws.close(code=4401)
        return
    await ws.accept()
    hub.add(uid, ws, client_id)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.remove(uid, ws, client_id)


app.include_router(api)
app.include_router(market_router)
app.include_router(clerk_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                    allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.alarms.create_index([("user_id", 1), ("status", 1)])
    await db.drawings.create_index([("user_id", 1), ("symbol", 1)])
    await db.drawings.create_index("id", unique=True)
    await db.settings.create_index("user_id", unique=True)
    app.state.engine_task = asyncio.create_task(engine.run())


@app.on_event("shutdown")
async def shutdown():
    app.state.engine_task.cancel()
    client.close()
