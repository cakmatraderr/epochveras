import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { market } from '../../lib/market';
import { fmtVol } from '../../lib/format';

export const FuturesPanel = ({ symbol, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/binance/openInterest?symbol=${symbol}`).then(async (r) => {
        if (!r.ok) throw new Error(`OI Hatası (${r.status})`);
        return r.json();
      }),
      fetch(`/api/binance/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`).then(async (r) => {
        if (!r.ok) throw new Error(`L/S Hatası (${r.status})`);
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
    <div className="ev-panel flex h-full flex-col" data-testid="futures-panel">
      <div className="ev-panel-title">
        <span>Futures Data <span className="text-[#787b86]">({symbol})</span></span>
        <button type="button" className="ev-iconbtn" onClick={onClose} data-testid="futures-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 space-y-3 text-xs text-[#d1d4dc]">
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-2">
          <span className="font-semibold text-[13px]">{symbol} Vadeli Verileri</span>
          <span className="text-[11px] text-[#787b86]">5dk Periyot</span>
        </div>

        {loading && <div className="text-[#787b86] py-6 text-center">Veriler çekiliyor...</div>}
        {error && <div className="text-[#f23645] py-6 text-center">{error}</div>}

        {!loading && !error && data && (
          <div className="space-y-4">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded p-2.5 space-y-1.5">
              <div className="text-[#787b86] text-[11px]">Açık Pozisyon (Open Interest)</div>
              <div className="font-mono text-sm font-semibold">
                {data.oiCoin.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-normal text-[#787b86]">{symbol.replace('USDT', '')}</span>
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
    </div>
  );
};
