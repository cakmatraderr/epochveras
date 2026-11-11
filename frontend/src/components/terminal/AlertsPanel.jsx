import { Trash2, X, BellRing, Bell } from 'lucide-react';
import { market } from '../../lib/market';
import { fmtPrice } from '../../lib/format';

const AlertRow = ({ a, onDelete, onPick, onRearm }) => {
  const prec = market.info[a.symbol]?.precision ?? 2;
  const active = a.status === 'active';
  return (
    <div className="ev-alert-row group" data-testid={`alert-row-${a.id}`} onClick={() => onPick(a.symbol)}>
      <div className={`mt-0.5 ${active ? 'text-[#ff9800]' : 'text-[#787b86]'}`}>{active ? <Bell size={15} /> : <BellRing size={15} />}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-[#d1d4dc]">
          <b>{a.symbol}</b> {a.direction === 'up' ? 'yukarı kesişim' : 'aşağı kesişim'} <b className="tabular-nums">{fmtPrice(a.price, prec)}</b>
        </div>
        <div className="text-[11px] text-[#787b86]">
          {active ? 'Aktif' : `Tetiklendi · ${new Date(a.triggered_at).toLocaleString('tr-TR')}`}
        </div>
      </div>
      {!active && (
        <button type="button" className="ev-iconbtn text-[11px]" data-testid={`alert-rearm-${a.id}`} onClick={(e) => { e.stopPropagation(); onRearm(a); }}>Yenile</button>
      )}
      <button type="button" className="ev-iconbtn hover:text-[#f23645]" data-testid={`alert-delete-${a.id}`} onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export const AlertsPanel = ({ alerts, onDelete, onPick, onRearm, onClose, onClearTriggered }) => {
  const active = alerts.filter((a) => a.status === 'active');
  const done = alerts.filter((a) => a.status !== 'active');
  return (
    <div className="ev-panel flex h-full flex-col" data-testid="alerts-panel">
      <div className="ev-panel-title">
        <span>Alarmlar <span className="text-[#787b86]">({active.length})</span></span>
        <div className="flex items-center gap-1">
          {done.length > 0 && (
            <button type="button" className="ev-iconbtn text-[11px]" onClick={onClearTriggered} data-testid="alerts-clear-triggered-btn">Tetiklenenleri temizle</button>
          )}
          <button type="button" className="ev-iconbtn" onClick={onClose} data-testid="alerts-close-btn"><X size={16} /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto" data-testid="alerts-list">
        {!alerts.length && (
          <div className="px-4 py-6 text-center text-[12px] leading-5 text-[#787b86]" data-testid="alerts-empty">
            Henüz alarm yok. Grafikte fiyat ölçeğinin yanındaki <b className="text-[#d1d4dc]">+</b> butonuna tıklayarak tek tıkla alarm kurabilirsiniz.
          </div>
        )}
        {[...active, ...done].map((a) => <AlertRow key={a.id} a={a} onDelete={onDelete} onPick={onPick} onRearm={onRearm} />)}
      </div>
    </div>
  );
};
