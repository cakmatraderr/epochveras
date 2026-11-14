import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { market } from '../../lib/market';
import { fmtPrice, fmtPct, fmtVol, fmtFunding } from '../../lib/format';
import { useMarketTick } from '../../hooks/useMarketTick';

const COLS = [
  { k: 'sym', l: 'Sembol' }, { k: 'last', l: 'Son' }, { k: 'pct', l: 'Değ%' }, { k: 'qv', l: '24s Hacim' }, { k: 'fund', l: 'Funding' },
];
const ROW_H = 26;

const sortVal = (s, k) => {
  if (k === 'sym') return s;
  if (k === 'fund') return market.funding[s] ?? 0;
  return market.tickers[s]?.[k] ?? 0;
};

const Header = ({ widths, setWidths, sort, setSort }) => {
  const startResize = (i, e) => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX; const w0 = widths[i];
    const move = (ev) => setWidths(widths.map((w, j) => (j === i ? Math.max(40, w0 + ev.clientX - x0) : w)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="ev-wl-head" data-testid="watchlist-header">
      {COLS.map((c, i) => (
        <div key={c.k} className={`ev-wl-cell ${i ? 'r' : ''}`} style={{ width: widths[i] }}>
          <button type="button" data-testid={`watchlist-sort-${c.k}`} className="truncate hover:text-[#d1d4dc]"
            onClick={() => {
              const newSort = { k: c.k, dir: sort.k === c.k ? -sort.dir : (c.k === 'sym' ? 1 : -1) };
              setSort(newSort);
            }}>
            {c.l}{sort.k === c.k ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
          </button>
          <span className="ev-col-resizer" data-testid={`watchlist-resize-${c.k}`} onPointerDown={(e) => startResize(i, e)} />
        </div>
      ))}
    </div>
  );
};

const Row = ({ s, widths, active, onPick, top }) => {
  const t = market.tickers[s] || {};
  const info = market.info[s];
  const f = market.funding[s];

  const [flash, setFlash] = useState(null);
  const prevPriceRef = useRef(t.last);

  useEffect(() => {
    if (t.last !== undefined && prevPriceRef.current !== undefined) {
      if (t.last > prevPriceRef.current) {
        setFlash('up');
      } else if (t.last < prevPriceRef.current) {
        setFlash('down');
      }
      if (t.last !== prevPriceRef.current) {
        const timer = setTimeout(() => setFlash(null), 400);
        prevPriceRef.current = t.last;
        return () => clearTimeout(timer);
      }
    }
    prevPriceRef.current = t.last;
  }, [t.last]);

  const pc = t.pct > 0 ? 'text-[#089981]' : t.pct < 0 ? 'text-[#f23645]' : 'text-[#d1d4dc]';

  let flashStyle = '';
  if (flash === 'up') {
    flashStyle = 'bg-[#089981]/20 text-[#089981] transition-colors duration-200';
  } else if (flash === 'down') {
    flashStyle = 'bg-[#f23645]/20 text-[#f23645] transition-colors duration-200';
  }

  return (
    <div className={`ev-wl-row ${active ? 'on' : ''}`} style={{ top }} onClick={() => onPick(s)} data-testid={`watchlist-row-${s}`}>
      <div className="ev-wl-cell font-medium text-[#d1d4dc]" style={{ width: widths[0] }}>{s}</div>
      <div className={`ev-wl-cell r rounded px-1 transition-colors ${flashStyle}`} style={{ width: widths[1] }} data-testid={`wl-price-${s}`}>
        {fmtPrice(t.last, info?.precision)}
      </div>
      <div className={`ev-wl-cell r ${pc}`} style={{ width: widths[2] }}>{fmtPct(t.pct)}</div>
      <div className="ev-wl-cell r" style={{ width: widths[3] }}>{fmtVol(t.qv)}</div>
      <div className={`ev-wl-cell r ${f > 0 ? 'text-[#089981]' : f < 0 ? 'text-[#f23645]' : ''}`} style={{ width: widths[4] }} data-testid={`wl-funding-${s}`}>
        {fmtFunding(f, market.fhours[s] || 8)}
      </div>
    </div>
  );
};

export const Watchlist = ({ symbol, onPick, widths, setWidths, onClose }) => {
  useMarketTick(1000);
  const [q, setQ] = useState('');
  
  const [sort, setSortState] = useState(() => {
    try {
      const saved = localStorage.getItem('ev_watchlist_sort');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { k: 'qv', dir: -1 };
  });

  const [scroll, setScroll] = useState(0);
  const [h, setH] = useState(400);
  const body = useRef(null);

  useEffect(() => {
    fetch('/api/settings/watchlist_sort')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.value) {
          setSortState(data.value);
          localStorage.setItem('ev_watchlist_sort', JSON.stringify(data.value));
        }
      })
      .catch((err) => console.error("Tercih yüklenemedi:", err));
  }, []);

  const setSort = (updater) => {
    setSortState((prev) => {
      const nextSort = typeof updater === 'function' ? updater(prev) : updater;
      
      try {
        localStorage.setItem('ev_watchlist_sort', JSON.stringify(nextSort));
      } catch (e) {}

      fetch('/api/settings/watchlist_sort', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: nextSort }),
      }).catch((err) => console.error("Kayıt hatası:", err));

      return nextSort;
    });
  };

  useEffect(() => {
    const ro = new ResizeObserver(() => body.current && setH(body.current.clientHeight));
    if (body.current) ro.observe(body.current);
    return () => ro.disconnect();
  }, []);

  const list = market.symbols.filter((s) => s.includes(q.toUpperCase()));
  
  const rows = useMemo(() => [...list].sort((a, b) => {
    const va = sortVal(a, sort.k); const vb = sortVal(b, sort.k);
    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
  }), [list, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const from = Math.max(0, Math.floor(scroll / ROW_H) - 5);
  const to = Math.min(rows.length, from + Math.ceil(h / ROW_H) + 10);
  const total = widths.reduce((a, b) => a + b, 0);

  return (
    <div className="ev-panel flex h-full flex-col" data-testid="watchlist-panel">
      <div className="ev-panel-title">
        <span>İzleme Listesi <span className="text-[#787b86]">({rows.length})</span></span>
        <button type="button" className="ev-iconbtn" onClick={onClose} data-testid="watchlist-close-btn"><X size={16} /></button>
      </div>
      <div className="relative px-2 pb-2">
        <Search size={14} className="absolute left-4 top-2 text-[#787b86]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sembol ara" className="ev-input pl-7" data-testid="watchlist-search-input" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto" ref={body} onScroll={(e) => setScroll(e.currentTarget.scrollTop)} data-testid="watchlist-body">
        <div style={{ minWidth: total }}>
          <Header widths={widths} setWidths={setWidths} sort={sort} setSort={setSort} />
          <div className="relative" style={{ height: rows.length * ROW_H }}>
            {rows.slice(from, to).map((s, i) => (
              <Row key={s} s={s} widths={widths} active={s === symbol} onPick={onPick} top={(from + i) * ROW_H} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
