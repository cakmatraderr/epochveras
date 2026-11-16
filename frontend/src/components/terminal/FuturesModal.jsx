import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { market } from '../../lib/market';

export const FuturesModal = ({ symbol, onClose }) => {
  const [lsAccount, setLsAccount] = useState(null);
  const [lsPosition, setLsPosition] = useState(null);
  const [globalRatio, setGlobalRatio] = useState(null);
  const [oiData, setOiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Projedeki mevcut market verisinden o anki coini bul
  const coinData = market.tickers?.[symbol];

  useEffect(() => {
    let alive = true;
    const fetchRatios = async () => {
      setLoading(true);
      try {
        const cleanSymbol = symbol.replace('.P', '');
        
        const accRes = await fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());
        const posRes = await fetch(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());
        const globRes = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());
        const oiRes = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanSymbol}`).then(r => r.json());

        if (alive) {
          if (accRes && accRes.length > 0) setLsAccount(accRes[0]);
          if (posRes && posRes.length > 0) setLsPosition(posRes[0]);
          if (globRes && globRes.length > 0) setGlobalRatio(globRes[0]);
          if (oiRes) setOiData(oiRes);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchRatios();
    return () => { alive = false; };
  }, [symbol]);

  const getPct = (item) => {
    if (!item) return { long: 50, short: 50 };
    const l = Number(item.longAccount || item.longPosition || 0.5) * 100;
    const s = Number(item.shortAccount || item.shortPosition || 0.5) * 100;
    const total = l + s;
    if (total === 0) return { long: 50, short: 50 };
    return { long: (l / total) * 100, short: (s / total) * 100 };
  };

  const accPct = getPct(lsAccount);
  const posPct = getPct(lsPosition);
  const globPct = getPct(globalRatio);

  // Watchlist ile aynı mantıkta FR ve Mark Price değerleri
  const frVal = coinData?.fundingRate !== undefined ? Number(coinData.fundingRate) * 100 : 0;
  const markVal = coinData?.close || coinData?.price || null;

  return (
    <div className="w-full bg-[#1e222d] border-l border-[#2a2e39] flex flex-col h-full text-[#d1d4dc]">
      <div className="flex items-center justify-between px-4 py-3 bg-[#131722] border-b border-[#2a2e39]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#2962ff]">{symbol}</span>
          <span className="text-xs px-1.5 py-0.5 bg-[#2a2e39] text-[#787b86] rounded">Futures Metrics</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                const cleanSymbol = symbol.replace('.P', '');
                const accRes = await fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());
                const posRes = await fetch(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());
                const globRes = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());
                const oiRes = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanSymbol}`).then(r => r.json());

                if (accRes && accRes.length > 0) setLsAccount(accRes[0]);
                if (posRes && posRes.length > 0) setLsPosition(posRes[0]);
                if (globRes && globRes.length > 0) setGlobalRatio(globRes[0]);
                if (oiRes) setOiData(oiRes);
              } catch (e) { console.error(e); }
              finally { setLoading(false); }
            }} 
            className="p-1 text-[#787b86] hover:text-[#fff] transition-colors" 
            title="Yenile"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} className="p-1 text-[#787b86] hover:text-[#fff] transition-colors" title="Kapat">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-3">
          {/* Fonlama Oranı (Watchlist Kaynağından) */}
          <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
            <div className="text-[#787b86] mb-1">Fonlama Oranı (FR)</div>
            <div className={`text-sm font-semibold tabular-nums ${frVal >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {frVal > 0 ? `+${frVal.toFixed(4)}%` : frVal < 0 ? `${frVal.toFixed(4)}%` : '0.0000%'}
            </div>
          </div>

          {/* Mark Fiyatı */}
          <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
            <div className="text-[#787b86] mb-1">Mark Fiyatı</div>
            <div className="text-sm font-semibold text-[#fff] tabular-nums">
              {markVal !== null ? (markVal < 1 ? Number(markVal).toFixed(6) : Number(markVal).toFixed(2)) : '-'}
            </div>
          </div>

          {/* LS Account */}
          <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[#787b86]">LS Account</span>
              <span className="font-semibold tabular-nums">
                <span className="text-[#089981]">%{accPct.long.toFixed(1)}</span> / <span className="text-[#f23645]">%{accPct.short.toFixed(1)}</span>
              </span>
            </div>
            <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#089981] transition-all duration-500" style={{ width: `${accPct.long}%` }} />
              <div className="h-full bg-[#f23645] transition-all duration-500" style={{ width: `${accPct.short}%` }} />
            </div>
          </div>

          {/* LS Position */}
          <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[#787b86]">LS Position</span>
              <span className="font-semibold tabular-nums">
                <span className="text-[#089981]">%{posPct.long.toFixed(1)}</span> / <span className="text-[#f23645]">%{posPct.short.toFixed(1)}</span>
              </span>
            </div>
            <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#089981] transition-all duration-500" style={{ width: `${posPct.long}%` }} />
              <div className="h-full bg-[#f23645] transition-all duration-500" style={{ width: `${posPct.short}%` }} />
            </div>
          </div>

          {/* LS Global */}
          <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[#787b86]">LS Global</span>
              <span className="font-semibold tabular-nums">
                <span className="text-[#089981]">%{globPct.long.toFixed(1)}</span> / <span className="text-[#f23645]">%{globPct.short.toFixed(1)}</span>
              </span>
            </div>
            <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#089981] transition-all duration-500" style={{ width: `${globPct.long}%` }} />
              <div className="h-full bg-[#f23645] transition-all duration-500" style={{ width: `${globPct.short}%` }} />
            </div>
          </div>

          {/* Açık Pozisyon (OI) */}
          <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
            <div className="text-[#787b86] mb-1">Açık Pozisyon (Open Interest)</div>
            <div className="text-sm font-semibold text-[#ff9800] tabular-nums">
              {oiData?.openInterest ? Number(oiData.openInterest).toLocaleString() : 'Yükleniyor...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
