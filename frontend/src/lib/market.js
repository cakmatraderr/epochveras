// frontend/src/lib/market.js

const WS = import.meta.env.VITE_WS_URL || 'wss://fstream.binance.com';
const API = import.meta.env.VITE_API_URL || '/api';

export const market = {
  tickers: {},
  live: 'connecting',
  subscribers: new Set(),

  init() {
    try {
      const ws = new WebSocket(`${WS}/ws/!miniTicker@arr`);
      ws.onopen = () => { this.live = 'live'; this.notify(); };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            data.forEach(t => {
              if (t.s) {
                this.tickers[t.s] = {
                  symbol: t.s,
                  price: parseFloat(t.c),
                  high: parseFloat(t.h),
                  low: parseFloat(t.l),
                  volume: parseFloat(t.v)
                };
              }
            });
            this.notify();
          }
        } catch (e) {
          console.error("MiniTicker parse error:", e);
        }
      };
      ws.onerror = () => { this.live = 'error'; this.notify(); };
      ws.onclose = () => { 
        this.live = 'disconnected'; 
        this.notify();
        setTimeout(() => this.init(), 3000);
      };
    } catch (e) {
      this.live = 'error';
      this.notify();
    }
  },

  subscribe(cb) {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  },

  notify() {
    this.subscribers.forEach(cb => cb(this));
  }
};

market.init();

export async function fetchKlines(symbol, interval, startTime, limit = 500) {
  try {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      interval: interval,
      limit: limit.toString()
    });
    if (startTime) params.append('startTime', startTime);

    const res = await fetch(`${API}/klines?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    return data.map(d => ({
      time: Math.floor(d[0] / 1000),
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    }));
  } catch (e) {
    console.error("Fetch klines error:", e);
    return [];
  }
}

// Hata veren eksik fonksiyon eklendi:
export async function loadHistory(symbol, interval, startTime, limit) {
  return await fetchKlines(symbol, interval, startTime, limit);
}

export function subscribeKline(symbol, interval, cb) {
  let ws = null;
  let stopped = false;

  const connectWs = () => {
    if (stopped) return;
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    ws = new WebSocket(`${WS}/ws/${streamName}`);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const k = message.k;
        if (k) {
          cb({
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            isFinal: k.x
          });
        }
      } catch (err) {
        console.error("Kline ws parse error:", err);
      }
    };

    ws.onerror = () => {
      if (ws) ws.close();
    };

    ws.onclose = () => {
      if (stopped) return;
      setTimeout(connectWs, 2000);
    };
  };

  connectWs();

  return () => {
    stopped = true;
    if (ws) ws.close();
  };
}
