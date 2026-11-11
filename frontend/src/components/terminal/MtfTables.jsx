import { useEffect, useState } from 'react';
import { fetchKlines } from '../../lib/market';
import { sfpState, pivState } from '../../lib/indicators/mtf';
import { valuesOf, isOn } from '../../lib/indicators/defs';

const SFP_TFS = [['30m', '30M'], ['1h', '1H'], ['2h', '2H'], ['4h', '4H'], ['1d', '1D']];
const PIV_TFS = [['1m', '1M'], ['3m', '3M'], ['5m', '5M'], ['15m', '15M'], ['30m', '30M'], ['1h', '60M']];

const Cell = ({ label, state, v, tid }) => (
  <div className="ev-mtf-cell" data-testid={tid} data-state={state}
    style={{ background: state === 1 ? v.bullColor : state === -1 ? v.bearColor : v.noneColor }}>
    {label}
  </div>
);

export const MtfTables = ({ symbol, ind, R }) => {
  const [st, setSt] = useState({});
  const [dims, setDims] = useState({ right: 70, bottom: 30 });
  const sfpOn = isOn(ind, { id: 'mtfsfp', pack: 'rdgpack' }); const pivOn = isOn(ind, { id: 'mtfpiv', pack: 'rdgpack' });
  const s = valuesOf(ind, 'sfp'); const p = valuesOf(ind, 'pivbar'); const fresh = valuesOf(ind, 'mtfsfp').freshBars;

  useEffect(() => {
    if (!sfpOn && !pivOn) return undefined;
    let alive = true;
    const run = async () => {
      const tfs = [...new Set([...(sfpOn ? SFP_TFS : []), ...(pivOn ? PIV_TFS : [])].map((t) => t[0]))];
      const res = await Promise.all(tfs.map((tf) => fetchKlines(symbol, tf, undefined, 500).then((b) => [tf, b]).catch(() => [tf, []])));
      if (!alive) return;
      const out = {};
      res.forEach(([tf, bars]) => {
        out[`sfp${tf}`] = bars.length ? sfpState(bars, s.len, s.rightBars, fresh) : 0;
        out[`piv${tf}`] = bars.length ? pivState(bars, p.LleftBars, p.RrightBars) : 0;
      });
      setSt(out);
    };
    run();
    const t = setInterval(run, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [symbol, sfpOn, pivOn, s.len, s.rightBars, fresh, p.LleftBars, p.RrightBars]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!R.chart) return;
      setDims({ right: R.chart.priceScale('right').width() + 8, bottom: R.chart.timeScale().height() + 8 });
    }, 1000);
    return () => clearInterval(t);
  }, [R]);

  return (
    <>
      {sfpOn && (
        <div className="ev-mtf ev-mtf-top" data-testid="mtf-sfp-table">
          {SFP_TFS.map(([tf, l]) => <Cell key={tf} label={l} state={st[`sfp${tf}`]} v={valuesOf(ind, 'mtfsfp')} tid={`mtf-sfp-${tf}`} />)}
        </div>
      )}
      {pivOn && (
        <div className="ev-mtf ev-mtf-br" style={{ right: dims.right, bottom: dims.bottom }} data-testid="mtf-pivot-table">
          {PIV_TFS.map(([tf, l]) => <Cell key={tf} label={l} state={st[`piv${tf}`]} v={valuesOf(ind, 'mtfpiv')} tid={`mtf-piv-${tf}`} />)}
        </div>
      )}
    </>
  );
};
