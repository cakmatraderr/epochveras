import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { market } from '../../lib/market';
import { fmtVol } from '../../lib/format';

export const FuturesPanel = ({ symbol, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    try {
      const cleanSymbol = symbol.replace('.P', '');

      // OI, L/S oranları ve Binance premium index (FR ve Mark Price için) verilerini çekiyoruz
      const [oiRes, lsArr, premiumRes] = await Promise.all([
        fetch(`/api/binance/openInterest?symbol=${symbol}`).then(r => r.ok ? r.json() : { openInterest: 0 }),
        fetch(`/api/binance/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`).then(r => r.ok ? r.json() : []),
        fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanSymbol}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const ls = Array.isArray(lsArr) && lsArr.length > 0 ? lsArr[0] : {};
      const longAcc = parseFloat(ls.longAccount || 0.5);
      const shortAcc = parseFloat(ls.shortAccount || 0.5);
      
      const ticker = market.tickers[symbol] || market.tickers[cleanSymbol] || {};
      const lastPrice = ticker.last || ticker.close || (premiumRes?.markPrice ? Number(premiumRes.markPrice) : 0);
      const markPrice = premiumRes?.markPrice ? Number(premiumRes.markPrice) : lastPrice;
      
      // Fonlama oranını öncelikle Binance API'den, yoksa market ticker'dan alıp yüzdeye çeviriyoruz
      let rawFr = 0;
      if (premiumRes?.lastFundingRate) {
        rawFr = Number(premiumRes.lastFundingRate) * 100;
      } else if (ticker.fundingRate !== undefined) {
        rawFr = Number(ticker.fundingRate) * 100;
      }
      
      const oiCoin = parseFloat(oiRes.openInterest || 0);

      setData({
        oiCoin,
        oiUsdt: lastPrice ? oiCoin * lastPrice : null,
        longPct: (longAcc * 100).toFixed(1),
        shortPct: (shortAcc * 100).toFixed(1),
        ratio: parseFloat(ls.longShortRatio || 1).toFixed(2),
        markPrice,
        fundingRate: rawFr,
      });
    } catch (err) {
      setError(err.message || 'Veri çekilemedi');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [symbol, fetchData]);

  return (
    <div className="ev-panel flex h-full flex-col bg-[#1e222d] text-[#d1d4dc]" data-testid="futures-panel">
      <div className="ev-panel-title flex items-center justify-between px-4 py-3 bg-[#131722] border-b border-[#2a2e39]">
        <span>Futures Data <span className="text-[#787b86]">({symbol})</span></span>
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            onClick={fetchData} 
            className="p-1 text-[#787b86] hover:text-[#fff] transition-colors rounded" 
            title="Yenile"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="ev-iconbtn text-[#787b86] hover:text-[#fff] p-1" onClick={onClose} data-testid="futures-close-btn">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 space-y-3 text-xs text-[#d1d4dc]">
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-2">
          <span className="font-semibold text-[13px]">{symbol} Vadeli Verileri</span>
          <span className="text-[11px] text-[#787b86]">5dk Periyot</span>
        </div>

        {loading && !data && <div className="text-[#787b86] py-6 text-center">Veriler çekiliyor...</div>}
        {error && <div className="text-[#f23645] py-6 text-center">{error}</div>}

        {data && (
          <div className="space-y-3">
            {/* Fonlama Oranı (FR) ve Mark Fiyatı */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#131722] border border-[#2a2e39] rounded p-2.5">
                <div className="text-[#787b86] text-[11px] mb-1">Funding Rate</div>
                <div className={`font-mono text-xs font-semibold tabular-nums ${data.fundingRate >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {data.fundingRate !== 0 ? (data.fundingRate > 0 ? `+${data.fundingRate.toFixed(4)}%` : `${data.fundingRate.toFixed(4)}%`) : '0.0000%'}
                </div>
              </div>

              <div className="bg-[#131722] border border-[#2a2e39] rounded p-2.5">
                <div className="text-[#787b86] text-[11px] mb-1">Mark Fiyatı</div>
                <div className="font-mono text-xs font-semibold text-[#fff] tabular-nums">
                  {data.markPrice ? (data.markPrice < 1 ? Number(data.markPrice).toFixed(6) : Number(data.markPrice).toFixed(2)) : '-'}
                </div>
              </div>
            </div>

            {/* Açık Pozisyon (Open Interest) */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded p-2.5 space-y-1.5">
              <div className="text-[#787b86] text-[11px]">Açık Pozisyon (Open Interest)</div>
              <div className="font-mono text-sm font-semibold text-[#ff9800]">
                {data.oiCoin.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-normal text-[#787b86]">{symbol.replace('USDT', '')}</span>
              </div>
              {data.oiUsdt && (
                <div className="font-mono text-xs text-[#787b86]">
                  ≈ ${fmtVol(data.oiUsdt)}
                </div>
              )}
            </div>

            {/* Long / Short Oranı */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded p-2.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#787b86] text-[11px]">LS Global Oranı</span>
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
    </div>
  );
};
