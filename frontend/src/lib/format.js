export const OFFSET = 3 * 3600; // Istanbul UTC+3

const nf = {};
const getNf = (p) => (nf[p] ||= new Intl.NumberFormat('tr-TR', { minimumFractionDigits: p, maximumFractionDigits: p }));

export const fmtPrice = (v, p = 2) => (v == null || isNaN(v) ? '—' : getNf(p).format(v));

export const fmtPct = (v) => (v == null || isNaN(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${getNf(2).format(Math.abs(v))}%`);

export const fmtVol = (v) => {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `${getNf(2).format(v / 1e9)}B`;
  if (a >= 1e6) return `${getNf(2).format(v / 1e6)}M`;
  if (a >= 1e3) return `${getNf(2).format(v / 1e3)}K`;
  return getNf(2).format(v);
};

export const fmtFunding = (r, h = 8) => (r == null || isNaN(r) ? '—' : `${r < 0 ? '−' : ''}${getNf(4).format(Math.abs(r) * 100)}% (${h}s)`);

export const decimals = (s) => {
  const t = String(s).replace(/0+$/, '');
  const i = t.indexOf('.');
  return i < 0 ? 0 : t.length - i - 1;
};

export const fmtDur = (sec) => {
  let s = Math.abs(Math.round(sec));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  const parts = [];
  if (d) parts.push(`${d}g`);
  if (h) parts.push(`${h}s`);
  if (m || !parts.length) parts.push(`${m}dk`);
  return parts.join(' ');
};

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const pad = (n) => String(n).padStart(2, '0');
export const fmtChartTime = (t) => {
  const d = new Date(t * 1000);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export const TIMEFRAMES = [
  { v: '1m', l: '1m', s: 60 }, { v: '3m', l: '3m', s: 180 }, { v: '5m', l: '5m', s: 300 },
  { v: '15m', l: '15m', s: 900 }, { v: '30m', l: '30m', s: 1800 }, { v: '1h', l: '1s', s: 3600 },
  { v: '2h', l: '2s', s: 7200 }, { v: '4h', l: '4s', s: 14400 }, { v: '6h', l: '6s', s: 21600 },
  { v: '12h', l: '12s', s: 43200 }, { v: '1d', l: '1G', s: 86400 }, { v: '1w', l: '1H', s: 604800 },
  { v: '1M', l: '1A', s: 2592000 },
];
export const tfInfo = (v) => TIMEFRAMES.find((t) => t.v === v) || TIMEFRAMES[0];
