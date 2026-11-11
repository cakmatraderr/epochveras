import { useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { market } from '../../lib/market';
import { fmtPrice, fmtPct } from '../../lib/format';

export const SymbolSearch = ({ open, onOpenChange, onPick }) => {
  const [q, setQ] = useState('');
  const list = market.symbols.filter((s) => s.includes(q.toUpperCase())).slice(0, 80);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ev-dialog max-w-[560px] gap-0 p-0" data-testid="symbol-search-dialog">
        <DialogHeader className="border-b border-[#2a2e39] px-5 py-4">
          <DialogTitle className="text-[18px] font-semibold text-[#d1d4dc]">Sembol Ara</DialogTitle>
        </DialogHeader>
        <div className="relative border-b border-[#2a2e39] px-5 py-3">
          <Search size={16} className="absolute left-8 top-[22px] text-[#787b86]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="BTCUSDT" className="ev-input h-9 pl-9" data-testid="symbol-search-input"
            onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) { onPick(list[0]); onOpenChange(false); } }} />
        </div>
        <div className="h-[380px] overflow-auto py-1">
          {list.map((s) => {
            const t = market.tickers[s] || {};
            return (
              <button key={s} type="button" data-testid={`symbol-option-${s}`} onClick={() => { onPick(s); onOpenChange(false); }}
                className="flex w-full items-center px-5 py-2 text-left text-[13px] hover:bg-[#1e222d]">
                <span className="flex-1 font-medium text-[#d1d4dc]">{s}<span className="ml-2 text-[11px] text-[#787b86]">Sürekli Vadeli · Binance</span></span>
                <span className="w-32 text-right tabular-nums text-[#d1d4dc]">{fmtPrice(t.last, market.info[s].precision)}</span>
                <span className={`w-20 text-right tabular-nums ${t.pct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>{fmtPct(t.pct)}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
