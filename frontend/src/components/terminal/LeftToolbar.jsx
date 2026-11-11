import { Crosshair, Ruler, Magnet, Trash2 } from 'lucide-react';

const TrendIcon = () => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.4">
    <line x1="6" y1="22" x2="22" y2="6" /><circle cx="6" cy="22" r="2" fill="#000" /><circle cx="22" cy="6" r="2" fill="#000" />
  </svg>
);
const RayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.4">
    <line x1="7" y1="14" x2="25" y2="14" /><circle cx="6" cy="14" r="2" fill="#000" />
  </svg>
);
const PosIcon = ({ long }) => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3">
    <rect x="5" y={long ? 5 : 14} width="18" height="9" fill={long ? 'rgba(8,153,129,.45)' : 'rgba(242,54,69,.45)'} stroke="none" />
    <rect x="5" y={long ? 14 : 5} width="18" height="9" fill={long ? 'rgba(242,54,69,.45)' : 'rgba(8,153,129,.45)'} stroke="none" />
    <line x1="5" y1="14" x2="23" y2="14" />
  </svg>
);

const TOOLS = [
  { id: 'cursor', label: 'Artı imleç', icon: <Crosshair size={20} strokeWidth={1.4} /> },
  { id: 'trend', label: 'Trend çizgisi', icon: <TrendIcon /> },
  { id: 'hray', label: 'Yatay ışın', icon: <RayIcon /> },
  { id: 'long', label: 'Alış pozisyonu', icon: <PosIcon long /> },
  { id: 'short', label: 'Satış pozisyonu', icon: <PosIcon /> },
  { id: 'ruler', label: 'Ölçüm (cetvel)', icon: <Ruler size={20} strokeWidth={1.4} /> },
];

export const LeftToolbar = ({ tool, setTool, magnet, setMagnet, onClear }) => (
  <aside className="ev-lefttools" data-testid="left-toolbar">
    {TOOLS.map((t) => (
      <button key={t.id} type="button" title={t.label} data-testid={`tool-${t.id}`} onClick={() => setTool(t.id)} className={`ev-toolbtn ${tool === t.id ? 'on' : ''}`}>
        {t.icon}
      </button>
    ))}
    <span className="my-1 h-px w-7 bg-[#2a2e39]" />
    <button type="button" title="Mıknatıs modu" data-testid="tool-magnet" onClick={() => setMagnet(!magnet)} className={`ev-toolbtn ${magnet ? 'on' : ''}`}>
      <Magnet size={20} strokeWidth={1.4} />
    </button>
    <button type="button" title="Tüm çizimleri sil" data-testid="tool-clear-drawings" onClick={onClear} className="ev-toolbtn hover:!text-[#f23645]">
      <Trash2 size={19} strokeWidth={1.4} />
    </button>
  </aside>
);
