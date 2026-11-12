// frontend/src/lib/market.js

const API = import.meta.env.VITE_API_URL || '/api';

export const market = {
  tickers: {},
  live: 'live',
  subscribers: new Set(),

  init() {
    // Güvenli başlatma (hata fırlatıp ekranı düşürmez)
    this.live = 'live';
    this.notify();
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

export async function loadHistory(symbol, interval, startTime, limit) {
  return await fetchKlines(symbol, interval, startTime, limit);
}

export function subscribeKline(symbol, interval, cb) {
  let stopped = false;
  let timer = null;

  // Güvenli polling (her saniye güncel mumu çekerek anlık hareket sağlar, bağlantı kopmalarını önler)
  const poll = async () => {
    if (stopped) return;
    try {
      const klines = await fetchKlines(symbol, interval, undefined, 2);
      if (klines && klines.length > 0) {
        const latest = klines[klines.length - 1];
        cb({
          time: latest.time,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close,
          volume: latest.volume,
          isFinal: false
        });
      }
    } catch (err) {
      console.error("Kline poll error:", err);
    }
  };

  // İlk çalıştır ve aralığı başlat
  poll();
  timer = setInterval(poll, 1000);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}
