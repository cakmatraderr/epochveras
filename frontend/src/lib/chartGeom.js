import { OFFSET } from './format';

// Maps real UTC seconds <-> pixel x, working across any timeframe via fractional logical indexes.
export function geom(R) {
  const { chart, series, bars, iv, box } = R;
  const n = bars.length;
  if (!chart || !n || !box) return null;
  const ts = chart.timeScale();
  const x0 = ts.logicalToCoordinate(0);
  const x1 = ts.logicalToCoordinate(1);
  if (x0 == null || x1 == null) return null;
  const sp = x1 - x0 || 1;

  const tToL = (ct) => {
    if (ct <= bars[0].time) return (ct - bars[0].time) / iv;
    if (ct >= bars[n - 1].time) return n - 1 + (ct - bars[n - 1].time) / iv;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (bars[m].time <= ct) lo = m; else hi = m;
    }
    return lo + (ct - bars[lo].time) / (bars[hi].time - bars[lo].time);
  };
  const lToT = (l) => {
    if (l <= 0) return bars[0].time + l * iv;
    if (l >= n - 1) return bars[n - 1].time + (l - (n - 1)) * iv;
    const i = Math.floor(l);
    return bars[i].time + (l - i) * (bars[i + 1].time - bars[i].time);
  };

  return {
    paneW: ts.width(),
    paneH: chart.panes()[0].getHeight(),
    iv,
    bars,
    tx: (t) => x0 + tToL(t + OFFSET) * sp,
    xt: (x) => lToT((x - x0) / sp) - OFFSET,
    py: (p) => series.priceToCoordinate(p),
    yp: (y) => series.coordinateToPrice(y),
    idx: (x) => Math.max(0, Math.min(n - 1, Math.round((x - x0) / sp))),
  };
}

export function pointAt(R, g, x, y, useMagnet = true) {
  if (useMagnet && R.magnet) {
    const b = g.bars[g.idx(x)];
    let best = b.close;
    let bd = Infinity;
    [b.open, b.high, b.low, b.close].forEach((v) => {
      const d = Math.abs(g.py(v) - y);
      if (d < bd) { bd = d; best = v; }
    });
    return { t: b.time - OFFSET, p: best };
  }
  return { t: g.xt(x), p: g.yp(y) };
}
