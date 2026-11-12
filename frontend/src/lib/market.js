// Live watchlist market store (all Binance perpetuals)
import { api } from './api';
import { OFFSET, decimals } from './format';

const DIRECT = 'https://fapi.binance.com/fapi/v1/';
const WS = 'wss://fstream.binance.com';
let direct = true;

// Akıllı görünürlük kontrolü: Sekmede 1 dakikadan uzun süre kalınmadıkça yenileme yapmaz
if (typeof document !== 'undefined') {
  let hiddenTime = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenTime = Date.now();
    } else if (hiddenTime > 0) {
      const elapsed = Date.now() - hiddenTime;
      hiddenTime = 0;
      if (elapsed > 60000) {
        window.location.reload();
      }
    }
  });
}

export async function bget(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  if (direct) {
    try {
      const r = await fetch(`${DIRECT}${path}${qs ? `?${qs}` : ''}`);
      if (r.ok) return await r.json();
      if (r.status === 451 || r.status === 403) direct = false;
    } catch {
      direct = false;
    }
  }
  return api.proxy(path, params);
}

const parseK = (k) => ({ time: k[0] / 1000 + OFFSET, open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] });

export async function fetchKlines(symbol, interval, endTime, limit = 1500) {
  const params = { symbol, interval, limit };
  if (endTime) params.endTime = endTime;
  return (await bget('klines', params)).map(parseK);
}

export async function loadHistory(symbol, interval, min = 5000) {
  let bars = [];
  let end;
  while (bars.length < min) {
    const page = await fetchKlines(symbol, interval, end);
    if (!page.length) break;
    bars = page.concat(bars.length ? bars.filter((b) => b.time > page[page.length - 1].time) : []);
    if (page.length < 1500) break;
    end = (page[0].time - OFFSET) * 1000 - 1;
  }
  return bars;
}

class Market {
  symbols = [];
  info = {};
  tickers = {};
  funding = {};
  fhours = {};
  listeners = new Set();
  live = 'connecting';

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach((f) => f());
  }

  init() {
    if (!this.initP) this.initP = this.load();
    return this.initP;
  }

  async load() {
    const [ex, tk, pi, fi] = await Promise.all([
      bget('exchangeInfo'), bget('ticker/24hr'), bget('premiumIndex'), bget('fundingInfo').catch(() => []),
    ]);
    ex.symbols
      .filter((s) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
      .forEach((s) => {
        const pf = s.filters.find((f) => f.filterType === 'PRICE_FILTER');
        this.info[s.symbol] = { tick: parseFloat(pf.tickSize), precision: decimals(pf.tickSize), base: s.baseAsset, quote: s.quoteAsset };
      });
    this.symbols = Object.keys(this.info);
    fi.forEach((f) => { this.fhours[f.symbol] = f.fundingIntervalHours; });
    this.applyTickers(tk);
    this.applyPremium(pi);
    this.connect();
    this.startPollingFallback();
  }

  applyTickers(arr) {
    if (!arr) return;
    arr.forEach((t) => {
      const s = t.s || t.symbol;
      if (!this.info[s]) return;
      const oldTicker = this.tickers[s];
      const newLast = +(t.c ?? t.lastPrice);
      const oldLast = oldTicker ? oldTicker.last : newLast;
      let dir = 0;
      if (newLast > oldLast) dir = 1;
      else if (newLast < oldLast) dir = -1;
      else if (oldTicker) dir = oldTicker.dir || 0;

      this.tickers[s] = { 
        last: newLast, 
        pct: +(t.P ?? t.priceChangePercent), 
        qv: +(t.q ?? t.quoteVolume),
        dir: dir 
      };
    });
  }

  applyPremium(arr) {
    if (!arr) return;
    arr.forEach((p) => {
      const s = p.s || p.symbol;
      const r = p.r ?? p.lastFundingRate;
      if (r !== undefined && r !== '') this.funding[s] = +r;
    });
  }

  connect() {
    let opened = false;
    try {
      const ws = new WebSocket(`${WS}/stream?streams=!ticker@arr/!markPrice@arr@1s`);
      const to = setTimeout(() => { 
        if (!opened) {
          try { ws.close(); } catch {}
          this.live = 'poll'; 
          this.emit(); 
        } 
      }, 5000);

      ws.onopen = () => { opened = true; this.live = 'ws'; this.emit(); };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.stream && m.stream.startsWith('!ticker')) this.applyTickers(m.data);
          else if (m.data) this.applyPremium(m.data);
          this.emit();
        } catch {}
      };
      ws.onerror = () => {
        this.live = 'poll';
        this.emit();
      };
      ws.onclose = () => {
        clearTimeout(to);
        this.live = 'poll';
        this.emit();
      };
    } catch {
      this.live = 'poll';
      this.emit();
    }
  }

  startPollingFallback() {
    setInterval(async () => {
      try {
        const tk = await bget('ticker/24hr');
        this.applyTickers(tk);
        this.emit();
      } catch {}
    }, 1000);
  }
}

export const market = new Market();

export function subscribeKline(symbol, interval, cb) {
  let ws;
  let timer;
  let stopped = false;

  // Garanti çalışan, her saniye anlık veriyi çekip callback'e veren canlı akış motoru
  const startLiveStream = () => {
    const poll = async () => {
      if (stopped) return;
      try {
        const klines = await fetchKlines(symbol, interval, undefined, 2);
        if (klines && klines.length > 0) {
          // Son mumu ve bir önceki mumu grafiğe doğrudan besle
          klines.forEach(k => cb(k));
        }
      } catch {}
    };

    poll();
    timer = setInterval(poll, 1000);
  };

  try {
    ws = new WebSocket(`${WS}/ws/${symbol.toLowerCase()}@kline_${interval}`);
    ws.onmessage = (e) => {
      try {
        const message = JSON.parse(e.data);
        const k = message.k;
        if (k) {
          cb({ 
            time: k.t / 1000 + OFFSET, 
            open: +k.o, 
            high: +k.h, 
            low: +k.l, 
            close: +k.c, 
            volume: +k.v 
          });
        }
      } catch {}
    };
    ws.onerror = () => {
      if (!timer && !stopped) startLiveStream();
    };
    ws.onclose = () => {
      if (!timer && !stopped) startLiveStream();
    };
  } catch {
    startLiveStream();
  }

  // Her ihtimale karşı (WebSocket engellenmesi durumunda) doğrudan polling'i de arka planda tetikle
  startLiveStream();

  return () => { 
    stopped = true; 
    if (ws) {
      try { ws.close(); } catch {}
    } 
    if (timer) clearInterval(timer); 
  };
}
