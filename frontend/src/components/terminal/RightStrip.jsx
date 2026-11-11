import { ListOrdered, AlarmClock } from 'lucide-react';

export const RightStrip = ({ wlOpen, alOpen, toggleWl, toggleAl, activeCount }) => (
  <aside className="ev-rightstrip" data-testid="right-icon-strip">
    <button type="button" title="İzleme listesi" data-testid="strip-watchlist-btn" onClick={toggleWl} className={`ev-toolbtn ${wlOpen ? 'on' : ''}`}>
      <ListOrdered size={20} strokeWidth={1.5} />
    </button>
    <button type="button" title="Alarmlar" data-testid="strip-alerts-btn" onClick={toggleAl} className={`ev-toolbtn relative ${alOpen ? 'on' : ''}`}>
      <AlarmClock size={20} strokeWidth={1.5} />
      {activeCount > 0 && <span className="ev-badge" data-testid="strip-alerts-count">{activeCount}</span>}
    </button>
  </aside>
);
