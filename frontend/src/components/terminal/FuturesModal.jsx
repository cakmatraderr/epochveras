import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, GripVertical } from 'lucide-react';
import { market } from '../../lib/market';
import { fmtVol } from '../../lib/format';

export const FuturesModal = ({ symbol, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Panel yüksekliği için state
  const [panelHeight, setPanelHeight] = useState(320);

  // Üst başlıktaki tutamaktan basıp sürükleyerek dikey boyutlandırma
  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startHeight = panelHeight;

    const onPointerMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(160, Math.min(800, startHeight + delta));
      setPanelHeight(newHeight);
    };

    const onPointerUp = (upEvent) => {
      upEvent.target.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const fetchFutures = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    try {
      const cleanSymbol = symbol.replace('.P', '');

      const [premiumRes, oiRes, accRes, posRes, globRes] = await Promise.all([
        fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanSymbol}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanSymbol}`).then(r => r.ok ? r.json() : { openInterest: 0 }),
        fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.ok ? r.json() : []),
        fetch(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.ok ? r.json() : []),
        fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.ok ? r.json() : []),
      ]);

      const acc = Array.isArray(accRes) && accRes.length > 0 ? accRes[0] : {};
      const pos = Array.isArray(posRes) && posRes.length > 0 ? posRes[0] : {};
      const glob = Array.isArray(globRes) && globRes.length > 0 ? globRes[0] : {};

      const ticker = market.tickers[symbol] || market.tickers[cleanSymbol] || {};

      let rawFr = 0;
      if (premiumRes?.lastFundingRate) {
        rawFr = Number(premiumRes.lastFundingRate) * 100;
      } else if (ticker.fundingRate !== undefined) {
        rawFr = Number(ticker.fundingRate) * 100;
      }

      const markPrice = premiumRes?.markPrice ? Number(premiumRes.markPrice) : (ticker.close || ticker.last || 0);
      const oiCoin = parseFloat(oiRes.openInterest || 0);

      const getPct = (item, lKey, sKey) => {
        const l = parseFloat(item[lKey] || 0.5) * 100;
        const s = parseFloat(item[sKey] || 0.5) * 100;
        const total = l + s;
        if (total === 0) return { long: 50, short: 50 };
        return { long: (l / total) * 100, short: (s / total) * 100 };
      };

      setData({
        oiCoin,
        oiUsdt: markPrice ? oiCoin * markPrice : null,
        markPrice,
        fundingRate: rawFr,
        acc: getPct(acc, 'longAccount', 'shortAccount'),
        pos: getPct(pos, 'longPosition', 'shortPosition'),
        glob: getPct(glob, 'longAccount', 'shortAccount'),
      });
    } catch (err) {
      setError(err.message || 'Veri çekilemedi');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    fetchFutures().then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [symbol, fetchFutures]);

  return (
    <div 
      className="ev-panel flex flex-col bg-[#1e222d] text-[#d1d4dc] border-b border-[#2a2e39] overflow-hidden select-none" 
      data-testid="futures-modal"
      style={{ height: `${panelHeight}px` }}
    >
      {/* Üst Başlık ve Boyutlandırma Tutamacı */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#131722] border-b border-[#2a2e39] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#2962ff]">{symbol}</span>
          <span className="text-xs px-1.5 py-0.5 bg-[#2a2e39] text-[#787b86] rounded">Futures Metrics</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Boyutlandırma Sürükleme İkonu (Üst Başlıkta) */}
          <div 
            className="p-1 text-[#787b86] hover:text-[#fff] cursor-ns-resize transition-colors touch-none flex items-center"
            onPointerDown={handlePointerDown}
            title="Yüksekliği ayarlamak için basıp sürükleyin"
          >
            <GripVertical size={14} />
          </div>

          <button 
            type="button" 
            onClick={fetchFutures} 
            className="p-1 text-[#787b86] hover:text-[#fff] transition-colors rounded" 
            title="Yenile"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button type="button" className="p-1 text-[#787b86] hover:text-[#fff] transition-colors" onClick={onClose} data-testid="futures-close-btn" title="Kapat">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* İçerik Alanı */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {loading && !data && <div className="text-[#787b86] py-8 text-center">Veriler yükleniyor...</div>}
        {error && <div className="text-[#f23645] py-8 text-center">{error}</div>}

        {data && (
          <div className="grid grid-cols-2 gap-3">
            {/* Fonlama Oranı (FR) */}
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Fonlama Oranı (FR)</div>
              <div className={`text-sm font-semibold tabular-nums ${data.fundingRate >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                {data.fundingRate !== 0 ? (data.fundingRate > 0 ? `+${data.fundingRate.toFixed(4)}%` : `${data.fundingRate.toFixed(4)}%`) : '0.0000%'}
              </div>
            </div>

            {/* Mark Fiyatı */}
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Mark Fiyatı</div>
              <div className="text-sm font-semibold text-[#fff] tabular-nums">
                {data.markPrice ? (data.markPrice < 1 ? Number(data.markPrice).toFixed(6) : Number(data.markPrice).toFixed(2)) : '-'}
              </div>
            </div>

            {/* LS Account */}
            <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#787b86]">LS Account</span>
                <span className="font-semibold tabular-nums">
                  <span className="text-[#089981]">%{data.acc.long.toFixed(1)}</span> / <span className="text-[#f23645]">%{data.acc.short.toFixed(1)}</span>
                </span>
              </div>
              <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden flex">
                <div style={{ width: `${data.acc.long}%` }} className="bg-[#089981] h-full transition-all duration-300" />
                <div style={{ width: `${data.acc.short}%` }} className="bg-[#f23645] h-full transition-all duration-300" />
              </div>
            </div>

            {/* LS Position */}
            <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#787b86]">LS Position</span>
                <span className="font-semibold tabular-nums">
                  <span className="text-[#089981]">%{data.pos.long.toFixed(1)}</span> / <span className="text-[#f23645]">%{data.pos.short.toFixed(1)}</span>
                </span>
              </div>
              <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden flex">
                <div style={{ width: `${data.pos.long}%` }} className="bg-[#089981] h-full transition-all duration-300" />
                <div style={{ width: `${data.pos.short}%` }} className="bg-[#f23645] h-full transition-all duration-300" />
              </div>
            </div>

            {/* LS Global */}
            <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#787b86]">LS Global</span>
                <span className="font-semibold tabular-nums">
                  <span className="text-[#089981]">%{data.glob.long.toFixed(1)}</span> / <span className="text-[#f23645]">%{data.glob.short.toFixed(1)}</span>
                </span>
              </div>
              <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden flex">
                <div style={{ width: `${data.glob.long}%` }} className="bg-[#089981] h-full transition-all duration-300" />
                <div style={{ width: `${data.glob.short}%` }} className="bg-[#f23645] h-full transition-all duration-300" />
              </div>
            </div>

            {/* Açık Pozisyon (OI) */}
            <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39] space-y-1">
              <div className="text-[#787b86]">Açık Pozisyon (Open Interest)</div>
              <div className="font-mono text-sm font-semibold text-[#ff9800]">
                {data.oiCoin.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-[#787b86]">{symbol.replace('USDT', '')}</span>
              </div>
              {data.oiUsdt && (
                <div className="font-mono text-xs text-[#787b86]">
                  ≈ ${fmtVol(data.oiUsdt)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
