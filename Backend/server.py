import os
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Doğru Binance Futures API adresi (Cloudflare engeline takılmamak için fapi kullanılır)
BINANCE_BASE = "https://fapi.binance.com/fapi/v1"

@app.get("/ping")
def ping():
    """Render uyku modunu önlemek ve sağlık kontrolü için ping endpoint'i"""
    return {"status": "alive", "message": "Pong!"}

@app.get("/api/binance/openInterest")
def get_open_interest(symbol: str):
    """Binance Futures Open Interest (Açık Pozisyon) Proxy'si"""
    try:
        url = f"{BINANCE_BASE}/openInterest?symbol={symbol}"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=5)
        
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Binance API hatası")
            
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/binance/globalLongShortAccountRatio")
def get_long_short_ratio(symbol: str, period: str = "5m", limit: int = 1):
    """Binance Futures Global Long/Short Hesap Oranı Proxy'si"""
    try:
        url = f"{BINANCE_BASE}/globalLongShortAccountRatio?symbol={symbol}&period={period}&limit={limit}"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=5)
        
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Binance API hatası")
            
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mevcut diğer proxy veya genel yönlendirici rotaların buranın altındaysa koruyabilirsin.
