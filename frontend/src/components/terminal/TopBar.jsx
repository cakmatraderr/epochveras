import { ChevronDown, FunctionSquare, AlarmClockPlus, Search } from 'lucide-react';
import { TIMEFRAMES } from '../../lib/format';

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
    <div className="flex items-center" data-testid="timeframe-bar">
      {TIMEFRAMES.filter((t) => FAV.includes(t.v) || t.v === tf).map((t) => (
        <button key={t.v} type="button" data-testid={`tf-${t.v}`} onClick={() => setTf(t.v)} className={`ev-tbtn px-2 ${tf === t.v ? 'text-[#2962ff]' : ''}`}>{t.l}</button>
      ))}
      <div className="group relative">
        <button type="button" className="ev-tbtn px-1" data-testid="tf-more-btn"><ChevronDown size={14} /></button>
        <div className="ev-menu hidden group-hover:block" data-testid="tf-more-menu">
          {TIMEFRAMES.map((t) => (
            <button key={t.v} type="button" data-testid={`tf-menu-${t.v}`} onClick={() => setTf(t.v)} className={`ev-menu-item ${tf === t.v ? 'text-[#2962ff]' : ''}`}>{t.l}</button>
          ))}
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
    <div className="ml-auto flex items-center gap-2 pr-2 text-[11px] text-[#787b86]" data-testid="live-status">
      <span className={`h-1.5 w-1.5 rounded-full ${live === 'connecting' ? 'bg-[#787b86]' : 'bg-[#089981] ev-pulse'}`} />
      {live === 'ws' ? 'Canlı' : live === 'poll' ? 'Canlı (yedek bağlantı)' : 'Bağlanıyor'} · UTC+3
    </div>
  </header>
);
