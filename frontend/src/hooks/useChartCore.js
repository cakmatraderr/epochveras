import { useEffect } from 'react';
import { createChart, CandlestickSeries, CrosshairMode, LineStyle } from 'lightweight-charts';
import { loadHistory, fetchKlines, subscribeKline, market } from '../lib/market';
import { fmtPrice, fmtChartTime, tfInfo, OFFSET } from '../lib/format';
import { candle, applyCandles } from './useIndicators';

const UP = '#089981';
const DOWN = '#f23645';

function legendFrom(R, i) {
  const b = R.bars[i];
  if (!b) return null;
  const prev = R.bars[i - 1];
  const chg = prev ? b.close - prev.close : b.close - b.open;
  const base = prev ? prev.close : b.open;
  return { ...b, i, chg, pct: (chg / base) * 100 };
}

export function useChartCore(R, symbol, tf, setLegend, setLoading) {
  useEffect(() => {
    const chart = createChart(R.box, {
      autoSize: true,
      layout: { background: { type: 'solid', color: '#000000' }, textColor: '#d1d4dc', fontSize: 12, attributionLogo: false,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif' },
      grid: { vertLines: { color: '#141414' }, horzLines: { color: '#141414' } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#9598a1', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#363a45' },
        horzLine: { color: '#9598a1', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#363a45' },
      },
      rightPriceScale: { borderColor: '#2a2e39', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false, rightOffset: 12, barSpacing: 7 },
      localization: { locale: 'tr-TR', timeFormatter: fmtChartTime },
    });
    const series = chart.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN });
    Object.assign(R, { chart, series, lines: new Map(), indSeries: new Map() });

    chart.subscribeCrosshairMove((param) => {
      R.cross = param.point && param.logical != null ? { x: param.point.x, y: param.point.y } : null;
      const n = R.bars.length;
      const i = param.logical != null && param.point ? Math.max(0, Math.min(n - 1, param.logical)) : n - 1;
      setLegend(legendFrom(R, i));
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (!r || R.loadingOlder || R.exhausted || !R.bars.length || r.from > 60) return;
      R.loadingOlder = true;
      const key = R.key;
      fetchKlines(R.symbol, R.tf, (R.bars[0].time - OFFSET) * 1000 - 1)
        .then((older) => {
          if (key !== R.key) return;
          if (!older.length) { R.exhausted = true; return; }
          R.bars = older.concat(R.bars);
          R.barColors = null;
          applyCandles(R);
          if (R.recomputeInd) R.recomputeInd(true);
        })
        .catch(() => {})
        .finally(() => { R.loadingOlder = false; });
    });
    return () => { chart.remove(); R.chart = null; };
  }, [R, setLegend]);

  useEffect(() => {
    const { chart, series } = R;
    const info = market.info[symbol] || { precision: 2, tick: 0.01 };
    Object.assign(R, { symbol, tf, iv: tfInfo(tf).s, prec: info.precision, tick: info.tick, key: `${symbol}|${tf}`, bars: [], exhausted: false, barColors: null });
    if (R.recomputeInd) R.recomputeInd(true);
    series.applyOptions({ priceFormat: { type: 'custom', minMove: info.tick, formatter: (p) => fmtPrice(p, info.precision) } });
    series.setData([]);
    setLegend(null);
    setLoading(true);
    let alive = true;
    let unsub;
    const onBar = (b) => {
      const n = R.bars.length;
      if (!n) return;
      const last = R.bars[n - 1];
      if (b.time === last.time) R.bars[n - 1] = b;
      else if (b.time > last.time) R.bars.push(b);
      else return;
      series.update(candle(b, R.barColors && R.barColors[R.bars.length - 1]));
      if (R.recomputeInd) R.recomputeInd(false);
      if (!R.cross) setLegend(legendFrom(R, R.bars.length - 1));
    };
    loadHistory(symbol, tf).then((bars) => {
      if (!alive) return;
      R.bars = bars;
      applyCandles(R);
      if (R.recomputeInd) R.recomputeInd(true);
      chart.timeScale().setVisibleLogicalRange({ from: bars.length - 150, to: bars.length + 10 });
      setLegend(legendFrom(R, bars.length - 1));
      setLoading(false);
      unsub = subscribeKline(symbol, tf, onBar);
    }).catch(() => alive && setLoading(false));
    return () => { alive = false; if (unsub) unsub(); };
  }, [R, symbol, tf, setLegend, setLoading]);
}

export function useAlertLines(R, alerts, symbol) {
  useEffect(() => {
    const tags = alerts.filter((a) => a.symbol === symbol && a.status === 'active');
    R.alertTags = tags;
    const ids = new Set(tags.map((a) => a.id));
    R.lines.forEach((ln, id) => { if (!ids.has(id)) { R.series.removePriceLine(ln); R.lines.delete(id); } });
    tags.forEach((a) => {
      const ex = R.lines.get(a.id);
      if (ex) { ex.applyOptions({ price: a.price }); return; }
      R.lines.set(a.id, R.series.createPriceLine({ price: a.price, color: '#ff9800', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' }));
    });
  }, [R, alerts, symbol]);
}
