import { rsi as taRsi, ma as taMa, series, lineData } from './ta';
import { PC } from './color';

function zigzag(vals, length) {
  const piv = [];
  for (let i = length - 1; i < vals.length; i += 1) {
    const v = vals[i];
    if (v == null) continue;
    let mx = -Infinity; let mn = Infinity; let ok = true;
    for (let j = i - length + 1; j <= i; j += 1) {
      if (vals[j] == null) { ok = false; break; }
      if (vals[j] > mx) mx = vals[j];
      if (vals[j] < mn) mn = vals[j];
    }
    if (!ok) continue;
    const isH = v >= mx; const isL = v <= mn;
    if (isH === isL) continue;
    const dir = isH ? 1 : -1;
    const last = piv[piv.length - 1];
    if (last && last.dir === dir) { if (dir > 0 ? v > last.val : v < last.val) Object.assign(last, { i, val: v }); } else piv.push({ i, dir, val: v });
  }
  return piv;
}

const ratio = (cur, prev, pprev) => (prev == null || pprev == null || pprev === prev ? 0 : Math.abs(cur - prev) / Math.abs(pprev - prev));
const getColor = (dir, r) => (dir > 0 ? (r > 1 ? PC.green : PC.orange) : (r > 1 ? PC.red : PC.lime));
const getText = (dir, r) => (dir > 0 ? (r > 1 ? 'HH' : 'LH') : (r > 1 ? 'LL' : 'HL'));

export function computeRdg(bars, v) {
  if (!bars.length) return {};
  let maxP = -Infinity; let minP = Infinity;
  bars.forEach((b) => { if (b.high > maxP) maxP = b.high; if (b.low < minP) minP = b.low; });
  const { c, v: vol } = series(bars);
  const r = taRsi(c, v.length);
  const m = taMa(v.maType, c, vol, v.maLength);
  const adj = r.map((x) => (x == null ? null : minP + (x * (maxP - minP)) / 100));
  const inR = () => true;
  const out = {
    lines: v.showRsi ? [{ key: 'rsi', title: 'RSI', noAutoscale: true, color: v.rsiColor, width: v.rsiWidth, data: lineData(bars, adj), vals: adj, legendVals: r }] : [],
    labels: [],
    segs: [],
  };
  const pv = zigzag(adj, v.zigzagLength);
  pv.forEach((p, k) => {
    p.close = c[p.i]; p.rsi = r[p.i]; p.ma = m[p.i];
    p.pr = ratio(p.close, pv[k - 1]?.close, pv[k - 2]?.close);
    p.rr = ratio(p.rsi, pv[k - 1]?.rsi, pv[k - 2]?.rsi);
  });
  const T = (i) => bars[i].time;
  const inPiv = pv.filter((p) => inR(p.i));
  if (v.showZigzag) {
    for (let k = 1; k < inPiv.length; k += 1) {
      const a = inPiv[k - 1]; const b = inPiv[k];
      out.segs.push({ t1: T(a.i), p1: a.close, t2: T(b.i), p2: b.close, color: v.zigzagColor, width: 1 });
      if (v.showRsi) out.segs.push({ t1: T(a.i), p1: a.val, t2: T(b.i), p2: b.val, color: v.zigzagColor, width: 1 });
    }
  }
  pv.forEach((p, k) => {
    if (!inR(p.i)) return;
    let pc = getColor(p.dir, p.pr); let pt = getText(p.dir, p.pr);
    let rc = getColor(p.dir, p.rr); let rt = getText(p.dir, p.rr);
    let div = 0;
    const last = pv[k - 2];
    if (pc !== rc && last && inR(last.i) && p.ma != null && last.ma != null) {
      const trend = Math.sign(p.ma - last.ma); const dir = Math.sign(last.dir); const sent = Math.sign(p.rr - p.pr);
      div = trend === dir && sent < 0 ? 1 : trend !== dir && sent > 0 ? -1 : 0;
      if (div !== 0) {
        const dc = dir > 0 ? v.bearColor : v.bullColor;
        out.segs.push({ t1: T(p.i), p1: p.close, t2: T(last.i), p2: last.close, color: dc, width: 1 });
        if (v.showRsi) out.segs.push({ t1: T(p.i), p1: p.val, t2: T(last.i), p2: last.val, color: dc, width: 1 });
        rt = div > 0 ? 'D' : 'H'; pt = rt;
        pc = div > 0 ? (dir > 0 ? PC.orange : PC.lime) : (dir > 0 ? PC.red : PC.green);
        rc = pc;
      }
    }
    if (v.showLabel || div !== 0) {
      const style = p.dir > 0 ? 'down' : 'up';
      out.labels.push({ t: T(p.i), p: p.close, text: pt, color: pc, textColor: v.textColor, style, size: 'tiny' });
      if (v.showRsi) out.labels.push({ t: T(p.i), p: p.val, text: rt, color: rc, textColor: v.textColor, style, size: 'tiny' });
    }
  });
  return out;
}
