import React from 'react';
import { ChevronDown, FunctionSquare, AlarmClockPlus, Search, Bell, Send } from 'lucide-react';
import { TIMEFRAMES } from '../../lib/format';
import { subscribeUserToPush, sendTestNotification } from '../../lib/pushService';

const FAV = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

export const TopBar = ({ symbol, tf, setTf, onSymbol, onIndicators, onAlert, live }) => (
  <header className="ev-topbar" data-testid="top-bar">
    <div className="flex items-center gap-2 pr-3">
      <div className="ev-logo" data-testid="app-logo">E</div>
      <span className="text-[15px] font-semibold tracking-tight text-[#d1d4dc]">Epochveras</span>
    </div>
    <span className="ev-sep" />
    <button type="button" className="ev-tbtn gap-2 font-semibold" onClick={onSymbol} data-testid="symbol-search-btn">
      <Search size={15} className="text-[#787b86]" />{symbol}
    </button>
    <span className="ev-sep" />

    {/* Zaman Dilimi Barı (12. Madde: Aktif Zaman Dilimine Arka Plan Vurgusu / Gölge) */}
    <div className="flex items-center gap-0.5" data-testid="timeframe-bar">
      {TIMEFRAMES.filter((t) => FAV.includes(t.v) || t.v === tf).map((t) => {
        const isActive = tf === t.v;
        return (
          <button 
            key={t.v} 
            type="button" 
            data-testid={`tf-${t.v}`} 
            onClick={() => setTf(t.v)} 
            className={`ev-tbtn px-2.5 py-1 rounded transition-colors ${
              isActive 
                ? 'bg-[#2a2e39] text-[#2962ff] shadow-sm font-bold' 
                : 'text-[#d1d4dc] hover:bg-[#2a2e39]/50'
            }`}
          >
            {t.l}
          </button>
        );
      })}
      <div className="group relative">
        <button type="button" className="ev-tbtn px-1 py-1 rounded hover:bg-[#2a2e39]/50" data-testid="tf-more-btn">
          <ChevronDown size={14} className="text-[#787b86]" />
        </button>
        <div className="ev-menu hidden group-hover:block absolute left-0 z-50 mt-1 bg-[#1e222d] border border-[#2a2e39] rounded shadow-lg" data-testid="tf-more-menu">
          {TIMEFRAMES.map((t) => {
            const isActive = tf === t.v;
            return (
              <button 
                key={t.v} 
                type="button" 
                data-testid={`tf-menu-${t.v}`} 
                onClick={() => setTf(t.v)} 
                className={`ev-menu-item w-full text-left px-3 py-1.5 ${
                  isActive ? 'bg-[#2a2e39] text-[#2962ff] font-bold' : 'text-[#d1d4dc] hover:bg-[#2a2e39]'
                }`}
              >
                {t.l}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <span className="ev-sep" />
    <button type="button" className="ev-tbtn gap-1.5" onClick={onIndicators} data-testid="indicators-btn">
      <FunctionSquare size={17} />Göstergeler
    </button>
    <span className="ev-sep" />
    <button type="button" className="ev-tbtn gap-1.5" onClick={onAlert} data-testid="top-alert-btn">
      <AlarmClockPlus size={17} />Alarm
    </button>

    {/* PWA Bildirim Entegrasyonu Butonları */}
    <span className="ev-sep" />
    <button 
      type="button" 
      className="ev-tbtn gap-1.5 text-[#2962ff] hover:bg-[#2a2e39]/50 px-2 py-1 rounded" 
      onClick={subscribeUserToPush}
      title="Telefona veya Tarayıcıya Bildirim İzni Ver"
      data-testid="push-subscribe-btn"
    >
      <Bell size={16} /> Bildirimleri Aç
    </button>

    <button 
      type="button" 
      className="ev-tbtn gap-1.5 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]/50 px-2 py-1 rounded" 
      onClick={() => sendTestNotification("Epochveras alarm test bildirimi başarıyla ulaştı!")}
      title="Test Bildirimi Gönder"
      data-testid="push-test-btn"
    >
      <Send size={14} /> Test
    </button>

    <div className="ml-auto flex items-center gap-2 pr-2 text-[11px] text-[#787b86]" data-testid="live-status">
      <span className={`h-1.5 w-1.5 rounded-full ${live === 'connecting' ? 'bg-[#787b86]' : 'bg-[#089981] ev-pulse'}`} />
      {live === 'ws' ? 'Canlı' : live === 'poll' ? 'Canlı (yedek bağlantı)' : 'Bağlanıyor'} · UTC+3
    </div>
  </header>
);
