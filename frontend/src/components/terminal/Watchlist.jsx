import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, BarChart2, List } from 'lucide-react';
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

const FuturesDataView = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/binance/openInterest?symbol=${symbol}`).then((r) => {
        if (!r.ok) throw new Error('OI verisi alınamadı');
        return r.json();
      }),
      fetch(`/api/binance/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`).then((r) => {
        if (!r.ok) throw new Error('L/S verisi alınamadı');
        return r.json();
      })
    ])
      .then(([oiData, lsArr]) => {
        if (cancelled) return;
        const ls = Array.isArray(lsArr) && lsArr.length > 0 ? lsArr[0] : {};
        const longAcc = parseFloat(ls.longAccount || 0.5);
        const shortAcc = parseFloat(ls.shortAccount || 0.5);
        const lastPrice = market.tickers[symbol]?.last || 0;
        const oiCoin = parseFloat(oiData.openInterest || 0);

        setData({
          oiCoin,
          oiUsdt: lastPrice ? oiCoin * lastPrice : null,
          longPct: (longAcc * 100).toFixed(1),
          shortPct: (shortAcc * 100).toFixed(1),
          ratio: parseFloat(ls.longShortRatio || 1).toFixed(2),
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <div className="p-3 space-y-3 text-xs text-[#d1d4dc] overflow-auto flex-1">
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-2">
        <span className="font-semibold text-sm">{symbol} Vadeli Verileri</span>
        <span className="text-[11px] text-[#787b86]">5dk Periyot</span>
      </div>

      {loading && <div className="text-[#787b86] py-4 text-center">Veriler çekiliyor...</div>}
      {error && <div className="text-[#f23645] py-4 text-center">{error}</div>}

      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded p-2.5 space-y-1.5">
            <div className="text-[#787b86] text-[11px]">Açık Pozisyon (Open Interest)</div>
            <div className="font-mono text-sm font-semibold">
              {data.oiCoin.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-[#787b86]">{symbol.replace('USDT', '')}</span>
            </div>
            {data.oiUsdt && (
              <div className="font-mono text-xs text-[#787b86]">
                ≈ ${fmtVol(data.oiUsdt)}
              </div>
            )}
          </div>

          <div className="bg-[#1e222d] border border-[#2a2e39] rounded p-2.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#787b86] text-[11px]">Long / Short Oranı</span>
              <span className="font-mono font-semibold text-[#d1d4dc]">{data.ratio}</span>
            </div>

            <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden flex">
              <div style={{ width: `${data.longPct}%` }} className="bg-[#089981] h-full transition-all duration-300" />
              <div style={{ width: `${data.shortPct}%` }} className="bg-[#f23645] h-full transition-all duration-300" />
            </div>

            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-[#089981]">Long %{data.longPct}</span>
              <span className="text-[#f23645]">Short %{data.shortPct}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Watchlist = ({ symbol, onPick, widths, setWidths, onClose }) => {
  useMarketTick(1000);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('watchlist'); // 'watchlist' | 'futures'

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
  }, [tab]);

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
      <div className="ev-panel-title flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('watchlist')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
              tab === 'watchlist' ? 'bg-[#2a2e39] text-[#d1d4dc] font-medium' : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <List size={13} />
            <span>Liste ({rows.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('futures')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
              tab === 'futures' ? 'bg-[#2a2e39] text-[#d1d4dc] font-medium' : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <BarChart2 size={13} />
            <span>Futures Data</span>
          </button>
        </div>
        <button type="button" className="ev-iconbtn" onClick={onClose} data-testid="watchlist-close-btn"><X size={16} /></button>
      </div>

      {tab === 'watchlist' ? (
        <>
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
        </>
      ) : (
        <FuturesDataView symbol={symbol} />
      )}
    </div>
  );
};
