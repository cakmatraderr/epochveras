import { pivothigh, pivotlow, series } from './ta';

export function sfpState(bars, len, rightBars, freshBars) {
  const { o, h, l, c } = series(bars);
  const ph = pivothigh(h, len, rightBars); const pl = pivotlow(l, len, rightBars);
  let sH = null; let sL = null; let lastBar = null; let state = 0;
  for (let i = 0; i < bars.length; i += 1) {
    if (ph[i] != null) sH = ph[i];
    if (pl[i] != null) sL = pl[i];
    if (sH != null && h[i] > sH && o[i] < sH && c[i] < sH) { lastBar = i; state = -1; }
    if (sL != null && l[i] < sL && o[i] > sL && c[i] > sL) { lastBar = i; state = 1; }
  }
  const fresh = lastBar != null && bars.length - 1 - lastBar <= freshBars;
  return fresh ? state : 0;
}

export function pivState(bars, left, right) {
  const { h, l, c } = series(bars);
  const swh = pivothigh(h, left, right); const swl = pivotlow(l, left, right);
  let hp = null; let lp = null; let st = 0;
  for (let i = 0; i < bars.length; i += 1) {
    const php = hp; const plp = lp;
    if (swh[i] != null) hp = swh[i];
    if (swl[i] != null) lp = swl[i];
    if (i > 0 && hp != null && php != null && c[i] > hp && c[i - 1] <= php) st = 1;
    if (i > 0 && lp != null && plp != null && c[i] < lp && c[i - 1] >= plp) st = -1;
  }
  return st;
}
