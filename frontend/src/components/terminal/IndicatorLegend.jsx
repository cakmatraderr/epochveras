import { useEffect, useState } from 'react';
import { Eye, Settings2 } from 'lucide-react';
import { INDICATORS, isOn, subsOf } from '../../lib/indicators/defs';
import { fmtPrice } from '../../lib/format';

const Values = ({ outs, ids, i, prec }) => ids.flatMap((id) => (outs[id]?.lines || []).map((ln) => {
  const arr = ln.legendVals || ln.vals;
  const v = arr && i != null ? arr[i] : null;
  const p = ln.legendVals || ln.plain ? 2 : prec;
  return (
    <span key={`${id}-${ln.key}`} className="tabular-nums" style={{ color: ln.colorAt && i != null ? ln.colorAt(i) : ln.color }}>
      {v == null ? '∅' : fmtPrice(v, p)}
    </span>
  );
}));

const Row = ({ d, ind, outs, i, prec, actions, ids, children }) => (
  <div className="ev-ind-row" data-testid={`legend-ind-${d.id}`}>
    <span className="text-[#d1d4dc]">{d.short}</span>
    {!d.master && <span className="text-[#787b86]">{d.inputs.filter((x) => x.t === 'int' && x.g !== 'Stil').slice(0, 2).map((x) => ind[d.id].values[x.k] ?? x.d).join(' ')}</span>}
    <Values outs={outs} ids={ids} i={i} prec={prec} />
    {children}
    <button type="button" className="ev-ind-btn" title="Gizle" onClick={() => actions.toggle(d.id, false)} data-testid={`legend-ind-hide-${d.id}`}><Eye size={13} /></button>
    <button type="button" className="ev-ind-btn" title="Ayarlar" onClick={() => actions.settings(d.id)} data-testid={`legend-ind-settings-${d.id}`}><Settings2 size={13} /></button>
  </div>
);

export const MainIndicatorLegend = ({ ind, outs, i, prec, actions }) => (
  <div className="mt-1 flex flex-col gap-0.5" data-testid="legend-indicators">
    {INDICATORS.filter((d) => !d.pack && !d.pane && isOn(ind, d)).map((d) => (
      <Row key={d.id} d={d} ind={ind} outs={outs} i={i} prec={prec} actions={actions} ids={d.master ? subsOf(d.id).filter((s) => isOn(ind, s)).map((s) => s.id) : [d.id]} />
    ))}
  </div>
);

export const PaneLegend = ({ R, ind, outs, i, actions }) => {
  const [top, setTop] = useState(null);
  const d = INDICATORS.find((x) => x.id === 'crsi');
  const on = isOn(ind, d) && outs.crsi;

  // Sayfa yüklendiğinde veya coin değiştiğinde kaydedilmiş yüksekliği uygula
  useEffect(() => {
    const applySavedHeight = () => {
      try {
        const saved = localStorage.getItem('ev_crsi_height');
        if (saved && R.chart && R.chart.panes && R.chart.panes()[1]) {
          const pane = R.chart.panes()[1];
          if (pane.setHeight) pane.setHeight(JSON.parse(saved));
        }
      } catch (e) {}
    };

    applySavedHeight();
    const timer = setTimeout(applySavedHeight, 100); // Grafik çizildikten sonra bir kez daha tetikle
    return () => clearTimeout(timer);
  }, [R, on]);

  // MongoDB'den kayıtlı yüksekliği çek ve uygula
  useEffect(() => {
    fetch('/api/settings/crsi_panel_height')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.value != null) {
          localStorage.setItem('ev_crsi_height', JSON.stringify(data.value));
          if (R.chart && R.chart.panes && R.chart.panes()[1]) {
            const pane = R.chart.panes()[1];
            if (pane.setHeight) pane.setHeight(data.value);
          }
        }
      })
      .catch((err) => {});
  }, [R]);

  // Panel boyut değişimlerini (resize) takip edip kalıcı hale getir
  useEffect(() => {
    if (!R.chart || !R.chart.panes) return;
    const pane = R.chart.panes()[1];
    if (!pane || !pane.height) return;

    let lastHeight = pane.height();
    const interval = setInterval(() => {
      try {
        const currentHeight = pane.height();
        if (currentHeight && currentHeight !== lastHeight) {
          lastHeight = currentHeight;
          localStorage.setItem('ev_crsi_height', JSON.stringify(currentHeight));
          fetch('/api/settings/crsi_panel_height', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: currentHeight }),
          }).catch(() => {});
        }
      } catch (e) {}
    }, 500);

    return () => clearInterval(interval);
  }, [R, on]);

  useEffect(() => {
    const t = setInterval(() => {
      const el = R.chart && R.chart.panes()[1] && R.chart.panes()[1].getHTMLElement();
      setTop(el ? el.getBoundingClientRect().top - R.box.getBoundingClientRect().top : null);
    }, 300);
    return () => clearInterval(t);
  }, [R]);

  if (!on || top == null) return null;
  const atr = outs.crsi.atr;
  return (
    <div className="ev-pane-legend" style={{ top: top + 4 }} data-testid="pane-legend-crsi">
      <Row d={d} ind={ind} outs={outs} i={i} prec={2} actions={actions} ids={['crsi']} />
      {ind.crsi.values.showAtr !== false && atr != null && (
        <div className="ev-atr" data-testid="crsi-atr-table">ATR ({ind.crsi.values.ATRlength}): {fmtPrice(atr, R.prec)}</div>
      )}
    </div>
  );
};
