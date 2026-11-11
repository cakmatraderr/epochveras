import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { INDICATORS, valuesOf, subsOf } from '../../lib/indicators/defs';
import { splitColor, joinColor } from '../../lib/indicators/color';
import { OFFSET } from '../../lib/format';

const toLocal = (t) => (t ? new Date((t + OFFSET) * 1000).toISOString().slice(0, 16) : '');
const fromLocal = (s) => (s ? Date.parse(`${s}:00Z`) / 1000 - OFFSET : 0);

const ColorInput = ({ value, onChange, id }) => {
  const { hex, alpha } = splitColor(value);
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={hex} onChange={(e) => onChange(joinColor(e.target.value, alpha))} className="ev-color" data-testid={`input-${id}`} />
      <input type="range" min={0} max={100} value={Math.round(alpha * 100)} onChange={(e) => onChange(joinColor(hex, e.target.value / 100))}
        className="w-20 accent-[#2962ff]" data-testid={`input-${id}-opacity`} title="Opaklık" />
      <span className="w-9 text-right text-[11px] tabular-nums text-[#787b86]">{Math.round(alpha * 100)}%</span>
    </div>
  );
};

const Field = ({ inp, value, onChange, id }) => {
  const tid = `${id}-${inp.k}`;
  if (inp.t === 'bool') return <Switch checked={!!value} onCheckedChange={onChange} data-testid={`input-${tid}`} />;
  if (inp.t === 'color') return <ColorInput value={value} onChange={onChange} id={tid} />;
  if (inp.t === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="ev-input h-8 !w-36" data-testid={`input-${tid}`}>
        {inp.opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (inp.t === 'width') {
    return (
      <select value={value} onChange={(e) => onChange(+e.target.value)} className="ev-input h-8 !w-20" data-testid={`input-${tid}`}>
        {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
      </select>
    );
  }
  if (inp.t === 'time') {
    return <input type="datetime-local" value={toLocal(value)} onChange={(e) => onChange(fromLocal(e.target.value))} className="ev-input h-8 !w-52" data-testid={`input-${tid}`} />;
  }
  return (
    <input type="number" value={value} min={inp.min} max={inp.max} step={inp.step || (inp.t === 'int' ? 1 : 'any')}
      onChange={(e) => { const v = inp.t === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
      className="ev-input h-8 !w-36 tabular-nums" data-testid={`input-${tid}`} />
  );
};

const InputsBody = ({ def, symbol, ind, onChange, onPick }) => {
  const { id } = def;
  const raw = valuesOf(ind, id);
  const vals = raw;
  const groups = [...new Set(def.inputs.map((i) => i.g))];
  const set = (k, v) => {
    const inp = def.inputs.find((i) => i.k === k);
    let x = v;
    if (typeof x === 'number' && inp.min != null) x = Math.max(inp.min, x);
    if (typeof x === 'number' && inp.max != null) x = Math.min(inp.max, x);
    onChange(id, {
      [k]: x });
  };
  return (
    <>
      {def.note && <div className="mb-3 rounded bg-[#131722] px-3 py-2 text-[12px] text-[#787b86]">{def.note}</div>}
      {groups.map((g) => (
        <div key={g} className="mb-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#787b86]">{g}</div>
          {def.inputs.filter((i) => i.g === g).map((inp) => (
            <div key={inp.k} className="flex min-h-[36px] items-center justify-between gap-4">
              <span className="min-w-0 flex-1 text-[13px] text-[#d1d4dc]">{inp.l}</span>
              <div className="shrink-0"><Field inp={inp} value={vals[inp.k]} onChange={(v) => set(inp.k, v)} id={id} /></div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

const SubSection = ({ def, ind, open, onOpen, onToggle, ...rest }) => (
  <div className="border-b border-[#2a2e39]" data-testid={`sub-section-${def.id}`}>
    <div className="flex items-center gap-3 py-2.5">
      <button type="button" className="flex flex-1 items-center gap-2 text-left text-[14px] text-[#d1d4dc]" onClick={onOpen} data-testid={`sub-expand-${def.id}`}>
        <ChevronRight size={15} className={`text-[#787b86] transition-transform ${open ? 'rotate-90' : ''}`} />{def.name}
      </button>
      <Switch checked={!!ind[def.id]?.enabled} onCheckedChange={(v) => onToggle(def.id, v)} data-testid={`sub-toggle-${def.id}`} />
    </div>
    {open && <div className="pb-2 pl-6"><InputsBody def={def} ind={ind} {...rest} /></div>}
  </div>
);

export const IndicatorSettings = ({ id, symbol, ind, onClose, onChange, onReset, onPick, onToggle }) => {
  const def = INDICATORS.find((d) => d.id === id);
  const [openSub, setOpenSub] = useState(null);
  if (!def) return null;
  const subs = subsOf(id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="ev-dialog max-w-[560px] gap-0 p-0" data-testid="indicator-settings-dialog">
        <DialogHeader className="border-b border-[#2a2e39] px-5 py-4">
          <DialogTitle className="text-[16px] font-semibold text-[#d1d4dc]">{def.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-auto px-5 py-3">
          {def.master
            ? subs.map((s) => (
              <SubSection key={s.id} def={s} ind={ind} open={openSub === s.id} onOpen={() => setOpenSub(openSub === s.id ? null : s.id)}
                onToggle={onToggle} symbol={symbol} onChange={onChange} onPick={onPick} />
            ))
            : <InputsBody def={def} symbol={symbol} ind={ind} onChange={onChange} onPick={onPick} />}
        </div>
        <div className="flex justify-between border-t border-[#2a2e39] px-5 py-3">
          <button type="button" onClick={() => (def.master ? subs.forEach((s) => onReset(s.id)) : onReset(id))} className="rounded px-3 py-1.5 text-[13px] text-[#d1d4dc] hover:bg-[#2a2e39]" data-testid="indicator-reset-btn">Varsayılanlar</button>
          <button type="button" onClick={onClose} className="rounded bg-[#2962ff] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#1e53e5]" data-testid="indicator-ok-btn">Tamam</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};