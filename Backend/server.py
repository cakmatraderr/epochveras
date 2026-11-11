import asyncio
import os
import time
import logging
import uuid
from contextlib import suppress
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from pymongo import ASCENDING, IndexModel
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

INDEXES: dict[str, list[IndexModel]] = {
    "drawings": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("symbol", ASCENDING)], name="symbol"),
    ],
    "alerts": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "settings": [IndexModel([("key", ASCENDING)], name="key", unique=True)],
}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


app = FastAPI()
api = APIRouter(prefix="/api")

# ---------- Binance proxy (fallback when browser cannot reach Binance directly) ----------
BINANCE_BASE = "https://www.binance.com/fapi/v1/"
ALLOWED = {"exchangeInfo": 600, "klines": 0, "ticker/24hr": 2, "premiumIndex": 3, "fundingInfo": 600}
_cache: Dict[str, tuple] = {}
_http: Optional[httpx.AsyncClient] = None


@api.get("/binance/{path:path}")
async def binance_proxy(path: str, request: Request):
    if path not in ALLOWED:
        raise HTTPException(404, "not allowed")
    params = dict(request.query_params)
    key = path + "?" + "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    ttl = ALLOWED[path]
    hit = _cache.get(key)
    if ttl and hit and time.time() - hit[0] < ttl:
        return hit[1]
    try:
        r = await _http.get(BINANCE_BASE + path, params=params)
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"binance unreachable: {exc}")
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.text[:200])
    data = r.json()
    if ttl:
        _cache[key] = (time.time(), data)
    return data


# ---------- Models ----------
class Drawing(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    symbol: str
    type: str


class AlertIn(BaseModel):
    symbol: str
    price: float
    direction: str
    message: str = ""


class Alert(AlertIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    triggered_at: Optional[str] = None


class AlertPatch(BaseModel):
    status: Optional[str] = None
    price: Optional[float] = None
    direction: Optional[str] = None
    triggered_at: Optional[str] = None


class SettingIn(BaseModel):
    value: Any


# ---------- Drawings ----------
@api.get("/drawings")
async def list_drawings(symbol: str) -> List[dict]:
    return await db.drawings.find({"symbol": symbol}, {"_id": 0}).to_list(2000)


@api.put("/drawings/{did}")
async def upsert_drawing(did: str, d: Drawing):
    doc = d.model_dump()
    doc["id"] = did
    await db.drawings.replace_one({"id": did}, doc, upsert=True)
    return doc


@api.delete("/drawings/{did}")
async def delete_drawing(did: str):
    await db.drawings.delete_one({"id": did})
    return {"ok": True}


@api.delete("/drawings")
async def clear_drawings(symbol: str):
    res = await db.drawings.delete_many({"symbol": symbol})
    return {"deleted": res.deleted_count}


# ---------- Alerts ----------
@api.get("/alerts")
async def list_alerts() -> List[dict]:
    return await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/alerts")
async def create_alert(a: AlertIn):
    alert = Alert(**a.model_dump())
    await db.alerts.insert_one(alert.model_dump())
    return alert


@api.patch("/alerts/{aid}")
async def patch_alert(aid: str, p: AlertPatch):
    upd = {k: v for k, v in p.model_dump().items() if v is not None}
    doc = await db.alerts.find_one_and_update({"id": aid}, {"$set": upd}, projection={"_id": 0}, return_document=True)
    if not doc:
        raise HTTPException(404, "not found")
    return doc


@api.delete("/alerts/{aid}")
async def delete_alert(aid: str):
    await db.alerts.delete_one({"id": aid})
    return {"ok": True}


# ---------- Settings ----------
@api.get("/settings/{key}")
async def get_setting(key: str):
    doc = await db.settings.find_one({"key": key}, {"_id": 0})
    return {"key": key, "value": doc["value"] if doc else None}


@api.put("/settings/{key}")
async def put_setting(key: str, s: SettingIn):
    await db.settings.replace_one({"key": key}, {"key": key, "value": s.value}, upsert=True)
    return {"key": key, "value": s.value}


@api.get("/")
async def root():
    return {"message": "Epochveras API"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    global _http
    _http = httpx.AsyncClient(timeout=20, headers={"User-Agent": "Mozilla/5.0"})
    app.state.index_task = asyncio.create_task(ensure_indexes())


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    await _http.aclose()
    client.close()
