import { api } from './api';
import { OFFSET, decimals } from './format';

const DIRECT = 'https://fapi.binance.com/fapi/v1/';
const WS = 'wss://fstream.binance.com';
let direct = true;

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
  }

  applyTickers(arr) {
    arr.forEach((t) => {
      const s = t.s || t.symbol;
      if (!this.info[s]) return;
      this.tickers[s] = { last: +(t.c ?? t.lastPrice), pct: +(t.P ?? t.priceChangePercent), qv: +(t.q ?? t.quoteVolume) };
    });
  }

  applyPremium(arr) {
    arr.forEach((p) => {
      const s = p.s || p.symbol;
      const r = p.r ?? p.lastFundingRate;
      if (r !== undefined && r !== '') this.funding[s] = +r;
    });
  }

  connect() {
    let opened = false;
    const ws = new WebSocket(`${WS}/stream?streams=!ticker@arr/!markPrice@arr@1s`);
    const to = setTimeout(() => { if (!opened) ws.close(); }, 7000);
    ws.onopen = () => { opened = true; this.live = 'ws'; this.emit(); };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.stream.startsWith('!ticker')) this.applyTickers(m.data);
      else this.applyPremium(m.data);
      this.emit();
    };
    ws.onclose = () => {
      clearTimeout(to);
      if (opened) setTimeout(() => this.connect(), 3000);
      else this.poll();
    };
  }

  poll() {
    if (this.polling) return;
    this.polling = true;
    this.live = 'poll';
    this.emit();
    setInterval(async () => { try { this.applyTickers(await bget('ticker/24hr')); this.emit(); } catch { /* retry */ } }, 3000);
    setInterval(async () => { try { this.applyPremium(await bget('premiumIndex')); this.emit(); } catch { /* retry */ } }, 10000);
  }
}

export const market = new Market();

export function subscribeKline(symbol, interval, cb) {
  let ws;
  let timer;
  let stopped = false;
  let opened = false;
  const poll = () => {
    const run = async () => {
      if (stopped) return;
      try { (await fetchKlines(symbol, interval, undefined, 2)).forEach(cb); } catch { /* retry */ }
    };
    run();
    timer = setInterval(run, 2000);
  };
  if (market.live === 'poll') poll();
  else {
    ws = new WebSocket(`${WS}/ws/${symbol.toLowerCase()}@kline_${interval}`);
    const to = setTimeout(() => { if (!opened) ws.close(); }, 7000);
    ws.onopen = () => { opened = true; };
    ws.onmessage = (e) => {
      const k = JSON.parse(e.data).k;
      cb({ time: k.t / 1000 + OFFSET, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v });
    };
    ws.onclose = () => { clearTimeout(to); if (!stopped) poll(); };
  }
  return () => { stopped = true; if (ws) ws.close(); clearInterval(timer); };
}
