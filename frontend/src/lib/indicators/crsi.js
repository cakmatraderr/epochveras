import { rma, ema, pivothigh, pivotlow, series, lineData } from './ta';

export const PINE_COLORS = {
  aqua: '#00BCD4', black: '#363A45', blue: '#2196F3', fuchsia: '#E040FB', gray: '#787B86', green: '#4CAF50', lime: '#00E676', maroon: '#880E4F',
  navy: '#311B92', olive: '#808000', orange: '#FF9800', purple: '#9C27B0', red: '#FF5252', silver: '#B2B5BE', teal: '#00897B', white: '#FFFFFF', yellow: '#FFEB3B',
};

const SRC = {
  close: (b) => b.close, open: (b) => b.open, high: (b) => b.high, low: (b) => b.low,
  hl2: (b) => (b.high + b.low) / 2, hlc3: (b) => (b.high + b.low + b.close) / 3, ohlc4: (b) => (b.open + b.high + b.low + b.close) / 4,
  hlcc4: (b) => (b.high + b.low + 2 * b.close) / 4,
};

const tAtFn = (bars) => (x) => {
  const n = bars.length;
  if (x >= 0 && x < n) return bars[x].time;
  const iv = n > 1 ? bars[n - 1].time - bars[n - 2].time : 60;
  return x < 0 ? bars[0].time + x * iv : bars[n - 1].time + (x - n + 1) * iv;
};

// LonesomeBlue RSI trendlines (evaluated on the last bar)
function trendlines(rsi, ph, pl, v, tAt, uc, dc) {
  const n = rsi.length; const bi = n - 1; const { prd, PPnum } = v; const maxline = 20;
  const lastK = (arr, k) => {
    const out = [];
    for (let i = n - 1; i >= 0 && out.length < k; i -= 1) if (arr[i]) out.push(i);
    return out;
  };
  const tp = lastK(ph, PPnum); const bp = lastK(pl, PPnum);
  const val = (pos) => (pos == null ? 0 : (rsi[pos - prd] ?? 0));
  const segs = [];
  const dash = v.linestylei === 'Dashed' ? [6, 4] : [];
  let cLo = 0; let cHi = 0;
  const scan = (positions, isLow) => {
    for (let p1 = 1; p1 <= PPnum - 1; p1 += 1) {
      let best = null;
      const cnt = isLow ? cLo : cHi;
      if (cnt <= maxline) {
        for (let p2 = PPnum; p2 >= p1 + 1; p2 -= 1) {
          const pos1 = positions[p1 - 1]; const pos2 = positions[p2 - 1];
          if (pos1 == null || pos2 == null) continue;
          const val1 = val(pos1); const val2 = val(pos2);
          if (isLow ? !(val1 > val2) : !(val1 < val2)) continue;
          const diff = (isLow ? val1 - val2 : val2 - val1) / (pos1 - pos2);
          let hline = isLow ? val2 + diff : val2 - diff;
          let lloc = bi; let lval = rsi[bi]; let valid = true; let broken = false;
          for (let x = pos2 + 1 - prd; x <= bi; x += 1) {
            const r = x >= 0 ? (rsi[x] ?? 0) : 0;
            if (isLow ? r < hline : r > hline) { valid = false; if (x + prd >= pos1) broken = true; break; }
            lloc = x; lval = hline; hline = isLow ? hline + diff : hline - diff;
          }
          if (valid) { best = { v1: hline, v2: val2, x1: lloc, x2: pos2 }; break; }
          const c = isLow ? cLo : cHi;
          if (v.showbroken && broken && c < maxline) {
            if (isLow) cLo += 1; else cHi += 1;
            segs.push({ t1: tAt(pos2 - prd), p1: val2, t2: tAt(lloc), p2: lval, color: isLow ? dc : uc, width: 1, dash: [2, 3], extend: v.extendlines && isLow, pane: 1 });
          }
        }
      }
      const c = isLow ? cLo : cHi;
      if (best && c < maxline) {
        if (isLow) cLo += 1; else cHi += 1;
        segs.push({ t1: tAt(best.x2 - prd), p1: best.v2, t2: tAt(best.x1), p2: best.v1, color: isLow ? dc : uc, width: v.linewidth, dash, extend: v.extendlines, pane: 1 });
      }
    }
  };
  // Pine interleaves lows and highs per p1; counts are independent so order does not change output
  scan(bp, true);
  scan(tp, false);
  return segs;
}

export function computeCrsi(bars, v) {
  const src = bars.map(SRC[v.src] || SRC.close);
  const up = rma(src.map((x, i) => (i === 0 ? null : Math.max(x - src[i - 1], 0))), v.len1);
  const dn = rma(src.map((x, i) => (i === 0 ? null : -Math.min(x - src[i - 1], 0))), v.len1);
  const rsi = up.map((u, i) => (u == null || dn[i] == null ? null : dn[i] === 0 ? 100 : u === 0 ? 0 : 100 - 100 / (1 + u / dn[i])));
  const rsiema = ema(rsi, v.len2);
  const tAt = tAtFn(bars);
  const ph = pivothigh(rsi, v.prd, v.prd); const pl = pivotlow(rsi, v.prd, v.prd);
  const uc = PINE_COLORS[v.line1_color] || PINE_COLORS.yellow;
  const dc = PINE_COLORS[v.line2_color] || PINE_COLORS.yellow;
  const segs = [];
  if (v.showpivot) {
    for (let i = 0; i < bars.length; i += 1) {
      if (ph[i]) segs.push({ t1: tAt(i - v.prd), p1: ph[i], t2: tAt(i - v.prd + 50), p2: ph[i], color: v.phColor, width: 2, pane: 1 });
      if (pl[i]) segs.push({ t1: tAt(i - v.prd), p1: pl[i], t2: tAt(i - v.prd + 50), p2: pl[i], color: v.plColor, width: 2, pane: 1 });
    }
  }
  if (bars.length > 2 * v.prd) segs.push(...trendlines(rsi, ph, pl, v, tAt, uc, dc));
  const { h, l, c } = series(bars);
  const tr = bars.map((b, i) => (i === 0 ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]))));
  const atr = rma(tr, v.ATRlength);
  return {
    pane: 1,
    lines: [
      { key: 'rsi', title: 'RSI-22', color: v.rsiColor, width: v.rsiWidth, data: lineData(bars, rsi), vals: rsi, pane: 1, plain: true },
      { key: 'rsiema', title: 'RSI-66', color: v.emaColor, width: v.emaWidth, data: lineData(bars, rsiema), vals: rsiema, pane: 1, plain: true },
    ],
    bands: [{ p1: 70, p2: 30, color: v.bgColor, pane: 1 }],
    hlines: [
      { p: 70, color: v.hl70 }, { p: 30, color: v.hl30 }, { p: 50, color: v.hl50 }, { p: 58, color: v.hl58 }, { p: 42, color: v.hl42 },
    ].map((x) => ({ ...x, pane: 1 })),
    fills: [{ a: rsi, b: rsiema, colorAt: (i) => (rsi[i] > rsiema[i] ? v.fillUp : v.fillDn), pane: 1 }],
    segs,
    atr: atr[atr.length - 1],
  };
}
