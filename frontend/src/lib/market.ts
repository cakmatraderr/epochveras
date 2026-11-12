// Live watchlist market store (all Binance perpetuals). Framework-agnostic external store:
// React reads it through useMarket(); the alert engine listens to raw ticks via onTicks().
import { useSyncExternalStore } from "react";
import { fetch24h, fetchFundingInfo, fetchPremium, fetchSymbols, WS_MARKET, type SymbolInfo } from "@/lib/binance";
import { simBasePrice, simStep, simSymbols } from "@/lib/sim";

export type MarketMode = "connecting" | "live" | "sim";

export interface Ticker {
  symbol: string;
  last: number;
  open: number;
  change: number;
  changePct: number;
  quoteVolume: number;
  funding: string | null;
  nextFunding: number | null;
  fundingHours: number;
  dir: 1 | -1 | 0;
}

export interface MarketState {
  mode: MarketMode;
  symbols: SymbolInfo[];
  bySymbol: Record<string, SymbolInfo>;
  tickers: Record<string, Ticker>;
}

type TickListener = (changed: Record<string, number>) => void;

let state: MarketState = { mode: "connecting", symbols: [], bySymbol: {}, tickers: {} };
const listeners = new Set<() => void>();
const tickListeners = new Set<TickListener>();
let started = false;
let emitTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleEmit() {
  if (emitTimer) return;
  emitTimer = setTimeout(() => {
    emitTimer = null;
    state = { ...state, tickers: { ...state.tickers } };
    listeners.forEach((l) => l());
  }, 400);
}

function setMode(mode: MarketMode, symbols: SymbolInfo[]) {
  const bySymbol: Record<string, SymbolInfo> = {};
  symbols.forEach((s) => (bySymbol[s.symbol] = s));
  state = { ...state, mode, symbols, bySymbol };
  listeners.forEach((l) => l());
}

function applyPrice(symbol: string, price: number, changed: Record<string, number>) {
  const t = state.tickers[symbol];
  if (!t || !Number.isFinite(price) || price === t.last) return;
  const change = price - t.open;
  state.tickers[symbol] = {
    ...t,
    last: price,
    change,
    changePct: t.open ? (change / t.open) * 100 : 0,
    dir: price > t.last ? 1 : -1,
  };
  changed[symbol] = price;
}

function fireTicks(changed: Record<string, number>) {
  if (Object.keys(changed).length === 0) return;
  tickListeners.forEach((l) => l(changed));
  scheduleEmit();
}

interface WsTicker { s: string; c: string; p: string; P: string; q: string; o: string }
interface WsMark { s: string; r: string; T: number }

function connectWs() {
  const ws = new WebSocket(`${WS_MARKET}?streams=!ticker@arr/!markPrice@arr@1s`);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data as string) as { stream: string; data: unknown };
    const changed: Record<string, number> = {};
    if (msg.stream === "!ticker@arr") {
      for (const d of msg.data as WsTicker[]) {
        const t = state.tickers[d.s];
        if (!t) continue;
        const last = +d.c;
        state.tickers[d.s] = {
          ...t,
          last,
          open: +d.o,
          change: +d.p,
          changePct: +d.P,
          quoteVolume: +d.q,
          dir: last > t.last ? 1 : last < t.last ? -1 : t.dir,
        };
        if (last !== t.last) changed[d.s] = last;
      }
    } else if (msg.stream.startsWith("!markPrice@arr")) {
      for (const d of msg.data as WsMark[]) {
        const t = state.tickers[d.s];
        if (t) state.tickers[d.s] = { ...t, funding: d.r, nextFunding: d.T };
      }
      scheduleEmit();
    }
    fireTicks(changed);
  };
  ws.onclose = () => setTimeout(connectWs, 3000);
}

async function startLive() {
  const [symbols, t24, prem, finfo] = await Promise.all([
    fetchSymbols(),
    fetch24h(),
    fetchPremium(),
    fetchFundingInfo().catch(() => []),
  ]);
  const hours = new Map(finfo.map((f) => [f.symbol, f.fundingIntervalHours]));
  const byS = new Map(t24.map((t) => [t.symbol, t]));
  const pm = new Map(prem.map((p) => [p.symbol, p]));
  const tickers: Record<string, Ticker> = {};
  for (const s of symbols) {
    const t = byS.get(s.symbol);
    const p = pm.get(s.symbol);
    const last = t ? +t.lastPrice : p ? +p.markPrice : 0;
    const change = t ? +t.priceChange : 0;
    tickers[s.symbol] = {
      symbol: s.symbol,
      last,
      open: last - change,
      change,
      changePct: t ? +t.priceChangePercent : 0,
      quoteVolume: t ? +t.quoteVolume : 0,
      funding: p?.lastFundingRate ?? null,
      nextFunding: p?.nextFundingTime ?? null,
      fundingHours: hours.get(s.symbol) ?? 8,
      dir: 0,
    };
  }
  state.tickers = tickers;
  setMode("live", symbols);
  connectWs();
}

function startSim() {
  const symbols = simSymbols();
  const tickers: Record<string, Ticker> = {};
  const hourly = 8 * 3600 * 1000;
  for (const s of symbols) {
    const last = simBasePrice(s.symbol);
    const pct = (Math.random() - 0.45) * 8;
    const open = last / (1 + pct / 100);
    tickers[s.symbol] = {
      symbol: s.symbol,
      last,
      open,
      change: last - open,
      changePct: pct,
      quoteVolume: Math.random() * 5e9 + 2e6,
      funding: ((Math.random() - 0.3) * 0.0004).toFixed(8),
      nextFunding: Math.ceil(Date.now() / hourly) * hourly,
      fundingHours: [8, 8, 4, 1][Math.floor(Math.random() * 4)],
      dir: 0,
    };
  }
  state.tickers = tickers;
  setMode("sim", symbols);
  setInterval(() => {
    const changed: Record<string, number> = {};
    for (const s of symbols) if (Math.random() < 0.6) applyPrice(s.symbol, simStep(state.tickers[s.symbol].last), changed);
    fireTicks(changed);
  }, 1000);
}

export const market = {
  start() {
    if (started) return;
    started = true;
    startLive().catch(() => startSim());
  },
  getState: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  onTicks(l: TickListener) {
    tickListeners.add(l);
    return () => {
      tickListeners.delete(l);
    };
  },
  /** Faster per-symbol updates from the chart's kline stream. */
  pushPrice(symbol: string, price: number) {
    const changed: Record<string, number> = {};
    applyPrice(symbol, price, changed);
    fireTicks(changed);
  },
};

export function useMarket(): MarketState {
  return useSyncExternalStore(market.subscribe, market.getState);
}
