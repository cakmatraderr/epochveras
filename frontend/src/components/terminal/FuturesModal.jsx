import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { market } from '../../lib/market';
import { fmtVol } from '../../lib/format';

export const FuturesModal = ({ symbol, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const fetchFutures = async () => {
      setLoading(true);
      setError(null);

      try {
        const cleanSymbol = symbol.replace('.P', '');

        // Tüm verileri paralel olarak çekiyoruz
        const [oiRes, accRes, posRes, globRes] = await Promise.all([
          fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanSymbol}`).then(r => r.json()),
          fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json()),
          fetch(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json()),
          fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json()),
        ]);

        if (cancelled) return;

        const acc = Array.isArray(accRes) && accRes.length > 0 ? accRes[0] : {};
        const pos = Array.isArray(posRes) && posRes.length > 0 ? posRes[0] : {};
        const glob = Array.isArray(globRes) && globRes.length > 0 ? globRes[0] : {};

        const lastPrice = market.tickers[symbol]?.close || market.tickers[symbol]?.last || market.tickers[cleanSymbol]?.close || 0;
        const coinFr = market.tickers[symbol]?.fundingRate !== undefined ? Number(market.tickers[symbol].fundingRate) * 100 : 0;
        
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
          oiUsdt: lastPrice ? oiCoin * lastPrice : null,
          markPrice: lastPrice,
          fundingRate: coinFr,
          acc: getPct(acc, 'longAccount', 'shortAccount'),
          pos: getPct(pos, 'longPosition', 'shortPosition'),
          glob: getPct(glob, 'longAccount', 'shortAccount'),
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Veri çekilemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFutures();

    return () => { cancelled = true; };
  }, [symbol]);

  // Manuel yenileme butonu için sarmalayıcı
  const handleRefresh = () => {
    if (!symbol) return;
    setLoading(true);
    // Tekrar tetiklemek için sembolü değiştirip eski haline getirebiliriz ya da fonksiyonu tetikleyebiliriz
    // useEffect zaten symbol değiştiğinde çalışıyor, pratik olması açısından sayfayı güncelleyebiliriz:
    const event = new Event('popstate');
    window.dispatchEvent(event);
  };

  return (
    <div className="ev-panel flex h-full flex-col bg-[#1e222d] text-[#d1d4dc]" data-testid="futures-modal">
      <div className="flex items-center justify-between px-4 py-3 bg-[#131722] border-b border-[#2a2e39]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#2962ff]">{symbol}</span>
          <span className="text-xs px-1.5 py-0.5 bg-[#2a2e39] text-[#787b86] rounded">Futures Metrics</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="p-1 text-[#787b86] hover:text-[#fff] transition-colors" title="Yenile">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="p-1 text-[#787b86] hover:text-[#fff] transition-colors" onClick={onClose} data-testid="futures-close-btn">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 space-y-3 text-xs">
        {loading && !data && <div className="text-[#787b86] py-8 text-center">Veriler yükleniyor...</div>}
        {error && <div className="text-[#f23645] py-8 text-center">{error}</div>}

        {data && (
          <div className="grid grid-cols-2 gap-3">
            {/* Fonlama Oranı (FR) */}
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Fonlama Oranı (FR)</div>
              <div className={`text-sm font-semibold tabular-nums ${data.fundingRate >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                {data.fundingRate > 0 ? `+${data.fundingRate.toFixed(4)}%` : `${data.fundingRate.toFixed(4)}%`}
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
