import { pivothigh, pivotlow, series, pineRange } from './ta';

// LuxAlgo Swing Failure Pattern (volume validation = None)
function side(bars, v, bear) {
  const n0 = bars.length;
  const { o, h, l, c } = series(bars);
  const pv = bear ? pivothigh(h, v.len, v.rightBars) : pivotlow(l, v.len, v.rightBars);
  const col = bear ? v.colBr : v.colBl;
  const col2 = bear ? v.colBr2 : v.colBl2;
  const extreme = bear ? h : l;
  const kept = [];
  const marks = [];
  let swing = null;
  let piv = null;
  const T = (i) => bars[i].time;
  for (let n = 0; n < n0; n += 1) {
    if (pv[n] != null) swing = { bix: n - v.rightBars, prc: pv[n] };
    if (swing) {
      const sw = swing.prc; const bx = swing.bix;
      const hit = bear ? (h[n] > sw && o[n] < sw && c[n] < sw) : (l[n] < sw && o[n] > sw && c[n] > sw);
      if (hit) {
        let opp = sw; let oppB = n;
        pineRange(1, n - bx - 1).forEach((i) => {
          if (n - i < 0) return;
          if (bear ? l[n - i] < opp : h[n - i] > opp) { opp = bear ? l[n - i] : h[n - i]; oppB = n - i; }
        });
        if (piv && piv.confirmed) kept.push(piv);
        piv = { sw, bx, opp, oppB, active: true, confirmed: false, n, ext: extreme[n], x2: n, label: 'SFP' };
      }
    }
    if (piv && piv.active && !piv.confirmed) {
      piv.x2 = n;
      if (bear ? c[n] < piv.opp : c[n] > piv.opp) {
        piv.confirmed = true;
        if (piv.n === n) piv.label = bear ? 'SFP\n▼' : '▲\nSFP';
        else marks.push({ t: T(n), p: extreme[n], text: bear ? '▼' : '▲', textColor: col, style: bear ? 'down' : 'up' });
      }
    }
    if (piv && (n - piv.bx > 500 || (bear ? c[n] > piv.sw : c[n] < piv.sw))) {
      piv.active = false;
      if (!piv.confirmed) piv = null;
    }
  }
  if (piv) kept.push(piv);
  const segs = []; const labels = [...marks];
  kept.forEach((p) => {
    if (v.dSwingLine) segs.push({ t1: T(Math.max(0, p.bx)), p1: p.sw, t2: T(p.x2), p2: p.sw, color: col, width: 1 });
    if (v.dOpposLine) segs.push({ t1: T(p.oppB), p1: p.opp, t2: T(p.x2), p2: p.opp, color: col, width: 1, dash: [2, 3] });
    if (v.dSFP_Line) segs.push({ t1: T(p.n), p1: p.ext, t2: T(p.n), p2: p.sw, color: col2, width: 3 });
    if (v.dSFP_Label) labels.push({ t: T(p.n), p: p.ext, text: p.label, textColor: col, style: bear ? 'down' : 'up' });
  });
  return { segs, labels };
}

export function computeSfp(bars, v) {
  const out = { segs: [], labels: [] };
  [v.bear && side(bars, v, true), v.bull && side(bars, v, false)].filter(Boolean).forEach((r) => {
    out.segs.push(...r.segs); out.labels.push(...r.labels);
  });
  return out;
}
