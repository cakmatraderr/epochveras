// Pine Script compatible TA helpers. Arrays aligned to bars; null = na.
export const sma = (src, len) => {
  const out = new Array(src.length).fill(null);
  let sum = 0; let cnt = 0;
  for (let i = 0; i < src.length; i += 1) {
    const v = src[i];
    if (v == null) { sum = 0; cnt = 0; continue; }
    sum += v; cnt += 1;
    if (cnt > len) { sum -= src[i - len]; cnt = len; }
    if (cnt === len) out[i] = sum / len;
  }
  return out;
};

const expMa = (src, len, alpha) => {
  const out = new Array(src.length).fill(null);
  const s = sma(src, len);
  let prev = null;
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] == null) continue;
    if (prev == null) { if (s[i] != null) prev = s[i]; } else prev = alpha * src[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
};

export const ema = (src, len) => expMa(src, len, 2 / (len + 1));
export const rma = (src, len) => expMa(src, len, 1 / len);

export const wma = (src, len) => {
  const out = new Array(src.length).fill(null);
  const den = (len * (len + 1)) / 2;
  for (let i = len - 1; i < src.length; i += 1) {
    let s = 0; let ok = true;
    for (let j = 0; j < len; j += 1) {
      const v = src[i - j];
      if (v == null) { ok = false; break; }
      s += v * (len - j);
    }
    if (ok) out[i] = s / den;
  }
  return out;
};

export const hma = (src, len) => {
  const a = wma(src, Math.floor(len / 2));
  const b = wma(src, len);
  return wma(a.map((v, i) => (v == null || b[i] == null ? null : 2 * v - b[i])), Math.floor(Math.sqrt(len)));
};

export const vwma = (src, vol, len) => {
  const a = sma(src.map((v, i) => v * vol[i]), len);
  const b = sma(vol, len);
  return a.map((v, i) => (v == null || !b[i] ? null : v / b[i]));
};

export const ma = (type, src, vol, len) => {
  if (type === 'ema') return ema(src, len);
  if (type === 'rma') return rma(src, len);
  if (type === 'hma') return hma(src, len);
  if (type === 'wma') return wma(src, len);
  if (type === 'vwma') return vwma(src, vol, len);
  return sma(src, len);
};

export const rsi = (src, len) => {
  const up = src.map((v, i) => (i === 0 ? null : Math.max(v - src[i - 1], 0)));
  const dn = src.map((v, i) => (i === 0 ? null : -Math.min(v - src[i - 1], 0)));
  const u = rma(up, len); const d = rma(dn, len);
  return u.map((x, i) => {
    if (x == null || d[i] == null) return null;
    if (d[i] === 0) return 100;
    if (x === 0) return 0;
    return 100 - 100 / (1 + x / d[i]);
  });
};

// value at index i (confirmation bar) when bar i-right is a pivot
export const pivot = (src, left, right, isHigh) => {
  const out = new Array(src.length).fill(null);
  for (let i = left + right; i < src.length; i += 1) {
    const c = i - right; const v = src[c];
    let ok = true;
    for (let j = 1; j <= left && ok; j += 1) if (isHigh ? src[c - j] > v : src[c - j] < v) ok = false;
    for (let j = 1; j <= right && ok; j += 1) if (isHigh ? src[c + j] >= v : src[c + j] <= v) ok = false;
    if (ok) out[i] = v;
  }
  return out;
};
export const pivothigh = (src, l, r) => pivot(src, l, r, true);
export const pivotlow = (src, l, r) => pivot(src, l, r, false);

// Pine-style for loop range (counts down when end < start)
export const pineRange = (a, b) => {
  const r = [];
  if (a <= b) for (let i = a; i <= b; i += 1) r.push(i);
  else for (let i = a; i >= b; i -= 1) r.push(i);
  return r;
};

export const series = (bars) => ({
  o: bars.map((b) => b.open), h: bars.map((b) => b.high), l: bars.map((b) => b.low), c: bars.map((b) => b.close), v: bars.map((b) => b.volume),
});

export const lineData = (bars, vals, colorFn) => bars.map((b, i) => {
  if (vals[i] == null) return { time: b.time };
  const d = { time: b.time, value: vals[i] };
  if (colorFn) d.color = colorFn(i);
  return d;
});
