import { pivothigh, pivotlow, series } from './ta';

// Lonesomeblue trendlines, evaluated on the last bar (lines are redrawn every bar in Pine).
function drawSet(bars, c, prdl, PPnum, colUp, colDn, width) {
  const n = bars.length;
  const { h, l } = series(bars);
  const ph = pivothigh(h, prdl, prdl); const pl = pivotlow(l, prdl, prdl);
  const tval = new Array(PPnum).fill(null); const tpos = new Array(PPnum).fill(null);
  const bval = new Array(PPnum).fill(null); const bpos = new Array(PPnum).fill(null);
  const add = (va, pa, val, i) => { va.unshift(val); pa.unshift(i); va.pop(); pa.pop(); };
  for (let i = 0; i < n; i += 1) {
    if (ph[i]) add(tval, tpos, ph[i], i);
    if (pl[i]) add(bval, bpos, pl[i], i);
  }
  const bi = n - 1;
  const segs = [];
  const tAt = (x) => (x >= 0 && x < n ? bars[x].time : bars[0].time + (x * (bars[1].time - bars[0].time)));
  const maxline = 5;
  let cLo = 0; let cHi = 0;
  for (let p1 = 0; p1 <= PPnum - 2; p1 += 1) {
    let uv1 = 0; let uv2 = 0; let up1 = 0; let up2 = 0;
    if (cLo <= maxline) {
      for (let p2 = PPnum - 1; p2 >= p1 + 1; p2 -= 1) {
        const val1 = bval[p1]; const val2 = bval[p2]; const pos1 = bpos[p1]; const pos2 = bpos[p2];
        if (val1 == null || val2 == null || !(val1 > val2)) continue;
        const diff = (val1 - val2) / (pos1 - pos2);
        let hline = val2 + diff; let lloc = bi; let valid = true;
        for (let x = pos2 + 1 - prdl; x <= bi; x += 1) {
          if (x >= 0 && c[x] < hline) { valid = false; break; }
          lloc = x; hline += diff;
        }
        if (valid) { uv1 = hline - diff; uv2 = val2; up1 = lloc; up2 = pos2; break; }
      }
    }
    let dv1 = 0; let dv2 = 0; let dp1 = 0; let dp2 = 0;
    if (cHi <= maxline) {
      for (let p2 = PPnum - 1; p2 >= p1 + 1; p2 -= 1) {
        const val1 = tval[p1]; const val2 = tval[p2]; const pos1 = tpos[p1]; const pos2 = tpos[p2];
        if (val1 == null || val2 == null || !(val1 < val2)) continue;
        const diff = (val2 - val1) / (pos1 - pos2);
        let hline = val2 - diff; let lloc = bi; let valid = true;
        for (let x = pos2 + 1 - prdl; x <= bi; x += 1) {
          if (x >= 0 && c[x] > hline) { valid = false; break; }
          lloc = x; hline -= diff;
        }
        if (valid) { dv1 = hline + diff; dv2 = val2; dp1 = lloc; dp2 = pos2; break; }
      }
    }
    if (up1 !== 0 && up2 !== 0 && cLo < maxline) {
      cLo += 1;
      segs.push({ t1: tAt(up2 - prdl), p1: uv2, t2: tAt(up1), p2: uv1, color: colUp, width });
    }
    if (dp1 !== 0 && dp2 !== 0 && cHi < maxline) {
      cHi += 1;
      segs.push({ t1: tAt(dp2 - prdl), p1: dv2, t2: tAt(dp1), p2: dv1, color: colDn, width });
    }
  }
  return segs;
}

export function computeTrendlines(bars, v) {
  if (bars.length < 3) return {};
  const start = Date.UTC(v.startyear, v.startmonth - 1, v.startday) / 1000;
  const lastReal = bars[bars.length - 1].time - 3 * 3600;
  if (lastReal < start) return {};
  const { c } = series(bars);
  return {
    segs: [
      ...(v.show1 ? drawSet(bars, c, v.prdl1, v.PPnum1, v.utcol, v.dtcol, v.width) : []),
      ...(v.show2 ? drawSet(bars, c, v.prdl2, v.PPnum2, v.utcol2, v.dtcol2, v.width) : []),
    ],
  };
}
