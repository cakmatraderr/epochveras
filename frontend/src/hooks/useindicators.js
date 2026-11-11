import { useEffect } from 'react';
import { LineSeries } from 'lightweight-charts';
import { INDICATORS, valuesOf, isOn } from '../lib/indicators/defs';
import { toRgba } from '../lib/indicators/color';
import { fmtPrice } from '../lib/format';

export function applyCandles(R) {
  const bc = R.barColors;
  R.series.setData(R.bars.map((b, i) => candle(b, bc && bc[i])));
}

export const candle = ({ time, open, high, low, close }, color) => (color
  ? { time, open, high, low, close, color, borderColor: color, wickColor: color }
  : { time, open, high, low, close });

function syncSeries(R, outs) {
  const want = new Map();
  Object.entries(outs).forEach(([id, o]) => (o.lines || []).forEach((ln) => want.set(`${id}:${ln.key}`, ln)));
  R.indSeries.forEach((s, k) => { if (!want.has(k)) { R.chart.removeSeries(s); R.indSeries.delete(k); } });
  if (R.chart.panes().length < 2) R.paneSized = false;
  want.forEach((ln, k) => {
    let s = R.indSeries.get(k);
    if (!s) {
      s = R.chart.addSeries(LineSeries, { priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: true, ...(ln.noAutoscale ? { autoscaleInfoProvider: () => null } : {}) }, ln.pane || 0);
      R.indSeries.set(k, s);
      const panes = R.chart.panes();
      if (ln.pane && panes.length > 1 && !R.paneSized) { panes[1].setHeight(Math.round(R.box.clientHeight * 0.28)); R.paneSized = true; }
    }
    const prec = ln.plain ? 2 : R.prec;
    s.applyOptions({ color: toRgba(ln.color || '#2196F3'), lineWidth: ln.width || 1, priceFormat: { type: 'custom', minMove: ln.plain ? 0.01 : R.tick, formatter: (p) => fmtPrice(p, prec) } });
    s.setData(ln.data.map((d) => (d.color ? { ...d, color: toRgba(d.color) } : d)));
  });
}

function syncBarColors(R, outs) {
  const bc = outs.pivbar?.barColors;
  if (bc) {
    R.barColors = bc.map((c) => (c ? toRgba(c) : null));
    applyCandles(R);
  } else if (R.barColors) {
    R.barColors = null;
    applyCandles(R);
  }
}

export function useIndicators(R, ind, onOut) {
  R.indState = ind;
  R.onIndOut = onOut;
  useEffect(() => {
    const run = () => {
      R.indTimer = null;
      if (!R.chart) return;
      const outs = {};
      if (R.bars.length) {
        INDICATORS.forEach((d) => {
          if (!d.compute || !isOn(R.indState, d)) return;
          const vals = valuesOf(R.indState, d.id);
          try { outs[d.id] = d.compute(R.bars, vals); } catch (e) { console.error(d.id, e); } // eslint-disable-line no-console
        });
      }
      R.indOut = outs;
      syncSeries(R, outs);
      syncBarColors(R, outs);
      if (R.onIndOut) R.onIndOut(outs);
    };
    R.recomputeInd = (now) => {
      if (now) { clearTimeout(R.indTimer); run(); } else if (!R.indTimer) R.indTimer = setTimeout(run, 1000);
    };
    return () => clearTimeout(R.indTimer);
  }, [R]);
  useEffect(() => { R.recomputeInd(true); }, [R, ind]);
}
