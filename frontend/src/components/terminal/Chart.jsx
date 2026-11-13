import { useRef, useState, useCallback, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useIndicators } from '../../hooks/useIndicators';
import { MainIndicatorLegend, PaneLegend } from './IndicatorLegend';
import { MtfTables } from './MtfTables';
import { useChartCore, useAlertLines } from '../../hooks/useChartCore';
import { useChartInteraction } from '../../hooks/useChartInteraction';
import { useLayout } from '../../hooks/useLayout';
import { api } from '../../lib/api';
import { fmtPrice, fmtPct, tfInfo } from '../../lib/format';

const SWATCHES = ['#2962ff', '#f23645', '#089981', '#ff9800', '#ffffff', '#e040fb', '#00bcd4'];

const Legend = ({ symbol, tf, lg, prec, children }) => {
  const col = lg && lg.chg >= 0 ? 'text-[#089981]' : 'text-[#f23645]';
  return (
    <div className="ev-legend" data-testid="chart-legend">
      <div className="flex items-center gap-2 text-[13px] text-[#d1d4dc]">
        <span className="font-semibold" data-testid="legend-symbol">{symbol}</span>
        <span className="text-[#787b86]">·</span><span>{tfInfo(tf).l}</span>
        <span className="text-[#787b86]">·</span><span>Binance</span>
      </div>
      {lg && (
        <div className="flex flex-wrap items-center gap-x-2.5 text-[12px] tabular-nums" data-testid="legend-ohlc">
          <span>A<b className={col}>{fmtPrice(lg.open, prec)}</b></span>
          <span>Y<b className={col}>{fmtPrice(lg.high, prec)}</b></span>
          <span>D<b className={col}>{fmtPrice(lg.low, prec)}</b></span>
          <span>K<b className={col}>{fmtPrice(lg.close, prec)}</b></span>
          <b className={col}>{lg.chg >= 0 ? '+' : '−'}{fmtPrice(Math.abs(lg.chg), prec)} ({fmtPct(lg.pct)})</b>
        </div>
      )}
      {children}
    </div>
  );
};

const SelectionBar = ({ d, onChange, onDelete }) => (
  <div className="ev-selbar" data-testid="drawing-toolbar">
    {(d.type === 'trend' || d.type === 'hray') && (
      <>
        {SWATCHES.map((c) => (
          <button key={c} type="button" data-testid={`drawing-color-${c.slice(1)}`} className={`ev-swatch ${d.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => onChange({ color: c })} />
        ))}
        <span className="mx-1 h-4 w-px bg-[#2a2e39]" />
        {[1, 2, 3, 4].map((w) => (
          <button key={w} type="button" data-testid={`drawing-width-${w}`} className={`ev-wbtn ${d.width === w ? 'on' : ''}`} onClick={() => onChange({ width: w })}>
            <span style={{ height: w }} />
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[#2a2e39]" />
      </>
    )}
    <button type="button" data-testid="drawing-delete-btn" className="ev-iconbtn hover:text-[#f23645]" onClick={onDelete} title="Sil"><Trash2 size={16} /></button>
  </div>
);

export const Chart = ({ symbol, tf, tool, setTool, magnet, alerts, onAddAlert, onDeleteAlert, clearSignal, ind, indActions }) => {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const R = useRef({ bars: [], drawings: [], iv: 60, prec: 2, tick: 0.01 }).current;
  const [legend, setLegend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [, bump] = useState(0);

  // Layout ve CRSI panel boyutu yönetimi doğrudan güvenli şekilde bağlandı
  const [layout, setLayout] = useLayout();

  R.tool = tool;
  R.magnet = magnet;

  useEffect(() => {
    if (layout && layout.crsiH) {
      R.crsiHeight = layout.crsiH;
      if (R.chart && R.chart.panes && R.chart.panes()[1]) {
        try {
          R.chart.panes()[1].setHeight(layout.crsiH);
        } catch (e) {}
      }
    }
  }, [layout, R]);

  const [outs, setOuts] = useState({});
  useChartCore(R, symbol, tf, setLegend, setLoading);
  useIndicators(R, ind, outs);
  useAlertLines(R, alerts, symbol);

  useEffect(() => {
    let alive = true;
    R.drawings = []; R.sel = null; R.draft = null; R.ruler = null; setSelId(null);
    api.drawings(symbol).then((ds) => { if (alive) R.drawings = ds; });
    return () => { alive = false; };
  }, [R, symbol, clearSignal]);

  useEffect(() => { R.draft = null; if (tool !== 'rdgpick') R.pick = null; if (tool !== 'ruler' && R.ruler && !R.ruler.done) R.ruler = null; }, [R, tool]);

  const deleteDrawing = useCallback((id) => {
    R.drawings = R.drawings.filter((d) => d.id !== id);
    R.sel = null; setSelId(null);
    api.deleteDrawing(id);
  }, [R]);

  useChartInteraction(R, wrap, canvas, { setTool, onAddAlert, onDeleteAlert, onSelect: setSelId, deleteDrawing, onRdgPick: indActions.onRdgPick });

  const sel = R.drawings.find((d) => d.id === selId);
  const change = (patch) => { Object.assign(sel, patch); api.saveDrawing(sel); bump((n) => n + 1); };

  return (
    <div ref={wrap} className="ev-chart-wrap" data-testid="chart-container">
      <div ref={(n) => { R.box = n; }} className="absolute inset-0" />
      <canvas ref={canvas} className="ev-overlay" data-testid="chart-overlay" />
      <Legend symbol={symbol} tf={tf} lg={legend} prec={R.prec}>
        <MainIndicatorLegend ind={ind} outs={outs} i={legend ? legend.i : null} prec={R.prec} actions={indActions} />
      </Legend>
      <PaneLegend R={R} ind={ind} outs={outs} i={legend ? legend.i : null} actions={indActions} setLayout={setLayout} />
      <MtfTables symbol={symbol} ind={ind} R={R} />
      {sel && <SelectionBar d={sel} onChange={change} onDelete={() => deleteDrawing(sel.id)} />}
      {loading && <div className="ev-loading" data-testid="chart-loading">Veriler yükleniyor…</div>}
    </div>
  );
};
