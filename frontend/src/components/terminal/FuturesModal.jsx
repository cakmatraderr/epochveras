import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

export const FuturesModal = ({ symbol, onClose }) => {
  const [data, setData] = useState(null);
  const [lsData, setLsData] = useState(null);
  const [oiData, setOiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchFuturesData = async () => {
      setLoading(true);
      try {
        const cleanSymbol = symbol.replace('.P', '');
        
        // 1. Premium Index (Funding Rate & Mark Price)
        const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanSymbol}`).then(r => r.json());
        
        // 2. Long/Short Ratio (Hesap Oranları)
        const lsRes = await fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=1h&limit=1`).then(r => r.json());  // 3. Open Interest (Açık Pozisyon) const oiRes = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanSymbol}`).then(r => r.json());

        if (alive) {
          setData(res);
          if (lsRes && lsRes.length > 0) {
            setLsData(lsRes[0]);
          }
          if (oiRes) {
            setOiData(oiRes);
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
                const res = await fetch(`
