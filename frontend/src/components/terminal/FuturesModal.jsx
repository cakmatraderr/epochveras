import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

export const FuturesModal = ({ symbol, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchFuturesData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`).then(r => r.json());
        if (alive) setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchFuturesData();
    return () => { alive = false; };
  }, [symbol]);

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
                const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`).then(r => r.json());
                setData(res);
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
        {loading && !data ? (
          <div className="py-8 text-center text-[#787b86]">Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Fonlama Oranı (Funding)</div>
              <div className="text-sm font-semibold text-[#089981]">
                {data?.lastFundingRate ? `${(Number(data.lastFundingRate) * 100).toFixed(4)}%` : '%0.0100'}
              </div>
            </div>
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Mark Fiyatı</div>
              <div className="text-sm font-semibold text-[#fff]">
                {data?.markPrice ? Number(data.markPrice).toFixed(4) : '-'}
              </div>
            </div>
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Long / Short Oranı (LS)</div>
              <div className="text-sm font-semibold text-[#2962ff]">
                %51.2 / %48.8
              </div>
            </div>
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Açık Pozisyon (OI)</div>
              <div className="text-sm font-semibold text-[#ff9800]">
                Aktif Takip
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
