import { useState } from 'react';
import { Search, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { INDICATORS } from '../../lib/indicators/defs';

export const IndicatorsDialog = ({ open, onOpenChange, ind, onToggle, onSettings }) => {
  const [q, setQ] = useState('');
  const list = INDICATORS.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ev-dialog max-w-[720px] gap-0 p-0" data-testid="indicators-dialog">
        <DialogHeader className="border-b border-[#2a2e39] px-5 py-4">
          <DialogTitle className="text-[18px] font-semibold text-[#d1d4dc]">Göstergeler</DialogTitle>
        </DialogHeader>
        <div className="relative border-b border-[#2a2e39] px-5 py-3">
          <Search size={16} className="absolute left-8 top-[22px] text-[#787b86]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" className="ev-input h-9 pl-9" data-testid="indicators-search-input" />
        </div>
        <div className="flex h-[420px]">
          <div className="w-[170px] border-r border-[#2a2e39] py-2">
            <div className="bg-[#2a2e39] px-5 py-2 text-[14px] text-[#d1d4dc]">Kişisel</div>
          </div>
          <div className="flex-1 overflow-auto py-1" data-testid="indicators-list">
            <div className="px-5 pb-1 pt-2 text-[11px] uppercase tracking-wide text-[#787b86]">Komut dosyası adı</div>
            {list.filter((d) => !d.pack).map((d) => (
              <div key={d.id} className="group flex items-center gap-3 px-5 py-2 hover:bg-[#2a2e39]" data-testid={`indicator-item-${d.id}`}>
                <span className="flex-1 text-[14px] text-[#d1d4dc]">{d.name}</span>
                <button type="button" className="ev-iconbtn" title="Ayarlar" data-testid={`indicator-settings-${d.id}`} onClick={() => onSettings(d.id)}>
                  <Settings2 size={16} />
                </button>
                <Switch checked={!!ind?.[d.id]?.enabled} onCheckedChange={(v) => onToggle(d.id, v)} data-testid={`indicator-toggle-${d.id}`} />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
