import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

export const FuturesModal = ({ symbol, onClose }) => {
  const [data, setData] = useState(null);
  const [lsData, setLsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchFuturesData = async () => {
      setLoading(true);
      try {
        // Sembolü Binance futures formatına uyarla (örn: DOGEUSDT)
        const cleanSymbol = symbol.replace('.P', '');
        
        // Premium Index (Funding Rate & Mark Price)
        const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanSymbol}`).then(r => r.json());
        
        // Long/Short Ratio (Hesap Oranları)
        const lsRes = await fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());

        if (alive) {
          setData(res);
          if (lsRes && lsRes.length > 0) {
            setLsData(lsRes[0]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchFuturesData();
    return () => { alive = false; };
  }, [symbol]);

  // Long / Short yüzdelerini hesapla (Varsayılan olarak veri yoksa %50 / %50 göster)
  const longRatio = lsData ? Number(lsData.longAccount) * 100 : 50.0;
  const shortRatio = lsData ? Number(lsData.shortAccount) * 100 : 50.0;

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
                const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanSymbol}`).then(r => r.json());
                const lsRes = await fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());
                setData(res);
                if (lsRes && lsRes.length > 0) setLsData(lsRes[0]);
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
            {/* Fonlama Oranı */}
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Fonlama Oranı (Funding)</div>
              <div className="text-sm font-semibold text-[#089981]">
                {data?.lastFundingRate ? `${(Number(data.lastFundingRate) * 100).toFixed(4)}%` : '%0.0100'}
              </div>
            </div>

            {/* Mark Fiyatı */}
            <div className="p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Mark Fiyatı</div>
              <div className="text-sm font-semibold text-[#fff]">
                {data?.markPrice ? Number(data.markPrice).toFixed(4) : '-'}
              </div>
            </div>

            {/* Long / Short Görsel Bar Alanı (Tüm genişliği kaplasın) */}
            <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[#787b86]">Long / Short Oranı (Hesap)</span>
                <span className="font-semibold tabular-nums">
                  <span className="text-[#089981]">%{longRegistry(longRatio)}</span> / <span className="text-[#f23645]">%{shortRegistry(shortRatio)}</span>
                </span>
              </div>
              
              {/* İki Renkli Görsel Bar */}
              <div className="w-full h-2.5 bg-[#2a2e39] rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-[#089981] transition-all duration-500" 
                  style={{ width: `${longRatio}%` }} 
                  title={`Long: %${longRatio.toFixed(1)}`}
                />
                <div 
                  className="h-full bg-[#f23645] transition-all duration-500" 
                  style={{ width: `${shortRatio}%` }} 
                  title={`Short: %${shortRatio.toFixed(1)}`}
                />
              </div>
            </div>

            {/* Açık Pozisyon Bilgisi */}
            <div className="col-span-2 p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
              <div className="text-[#787b86] mb-1">Açık Pozisyon (OI Durumu)</div>
              <div className="text-sm font-semibold text-[#ff9800]">
                Binance Futures Canlı Takip Aktif
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Yardımcı format fonksiyonları
function longRegistry(val) {
  return isNaN(val) ? '50.0' : val.toFixed(1);
}
function shortRegistry(val) {
  return isNaN(val) ? '50.0' : val.toFixed(1);
}
