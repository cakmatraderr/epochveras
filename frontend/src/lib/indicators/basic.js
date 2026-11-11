import { ema, pivothigh, pivotlow, series, lineData } from './ta';

export function computeEma2(bars, v) {
  const { c } = series(bars);
  const e1 = ema(c, v.length1); const e2 = ema(c, v.length2);
  return {
    lines: [
      v.show1 && { key: 'ema1', title: 'EMA 1', color: v.color1, width: v.width1, data: lineData(bars, e1), vals: e1 },
      v.show2 && { key: 'ema2', title: 'EMA 2', color: v.color2, width: v.width2, data: lineData(bars, e2), vals: e2 },
    ].filter(Boolean),
  };
}

export function computeEmaCross(bars, v) {
  const { c } = series(bars);
  const slow = ema(c, v.emaSlowLen); const fast = ema(c, v.emaFastLen);
  const col = (i) => (fast[i] > slow[i] ? v.upColor : fast[i] < slow[i] ? v.downColor : v.eqColor);
  const shapes = [];
  if (v.pa) {
    for (let i = 1; i < bars.length; i += 1) {
      if (fast[i] == null || slow[i] == null) continue;
      if (fast[i] > slow[i] && c[i - 1] < slow[i]) shapes.push({ t: bars[i].time, p: bars[i].low, pos: 'below', kind: 'up', color: v.upArrowColor });
      if (fast[i] < slow[i] && c[i - 1] > slow[i]) shapes.push({ t: bars[i].time, p: bars[i].high, pos: 'above', kind: 'down', color: v.downArrowColor });
    }
  }
  return {
    lines: [
      { key: 'slow', title: 'Slow MA', width: v.width, data: lineData(bars, slow, col), vals: slow, colorAt: col },
      { key: 'fast', title: 'Fast MA', width: v.width, data: lineData(bars, fast, col), vals: fast, colorAt: col },
    ],
    fills: [{ a: slow, b: fast, color: v.fillColor }],
    shapes,
  };
}

export function computePivotBars(bars, v) {
  const { h, l, c } = series(bars);
  const swh = pivothigh(h, v.LleftBars, v.RrightBars);
  const swl = pivotlow(l, v.LleftBars, v.RrightBars);
  const colors = new Array(bars.length).fill(null);
  let hp = 0; let lp = 0; let state = 0;
  for (let i = 0; i < bars.length; i += 1) {
    const php = hp; const plp = lp;
    if (swh[i] != null) hp = swh[i];
    if (swl[i] != null) lp = swl[i];
    if (i > 0 && c[i] > hp && c[i - 1] <= php) state = 1;
    if (i > 0 && c[i] < lp && c[i - 1] >= plp) state = -1;
    colors[i] = state === 1 ? v.longColor : state === -1 ? v.shortColor : null;
  }
  return { barColors: colors };
}
