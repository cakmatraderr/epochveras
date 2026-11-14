import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { Toaster } from './components/ui/sonner';
import { market } from './lib/market';
import { api } from './lib/api';
import { useAlerts } from './hooks/useAlerts';
import { useLayout, useDrag } from './hooks/useLayout';
import { useMarketTick } from './hooks/useMarketTick';
import { Chart } from './components/terminal/Chart';
import { TopBar } from './components/terminal/TopBar';
import { LeftToolbar } from './components/terminal/LeftToolbar';
import { RightStrip } from './components/terminal/RightStrip';
import { Watchlist } from './components/terminal/Watchlist';
import { AlertsPanel } from './components/terminal/AlertsPanel';
import { IndicatorsDialog } from './components/terminal/IndicatorsDialog';
import { IndicatorSettings } from './components/terminal/IndicatorSettings';
import { useIndicatorSettings } from './hooks/useIndicatorSettings';
import { SymbolSearch } from './components/terminal/SymbolSearch';
import { AlertDialog } from './components/terminal/AlertDialog';

const SidePanels = ({ L, set, alertsApi, pickSymbol }) => {
  const dragW = useDrag((dx) => set((l) => ({ sideW: Math.min(1100, Math.max(260, l.sideW - dx)) })));
  const dragH = useDrag((dx, dy) => set((l) => ({ alH: Math.min(window.innerHeight - 160, Math.max(100, l.alH - dy)) })));
  if (!L.wlOpen && !L.alOpen) return null;
  return (
    <div className="ev-side" style={{ width: L.sideW }} data-testid="side-panels">
      <div className="ev-vresizer" onPointerDown={dragW} data-testid="side-width-resizer" />
      {L.wlOpen && (
        <div className="min-h-0 flex-1">
          <Watchlist symbol={L.symbol} onPick={pickSymbol} widths={L.cols} setWidths={(cols) => set({ cols })} onClose={() => set({ wlOpen: false })} />
        </div>
      )}
      {L.wlOpen && L.alOpen && <div className="ev-hresizer" onPointerDown={dragH} data-testid="side-height-resizer" />}
      {L.alOpen && (
        <div className={L.wlOpen ? 'shrink-0' : 'min-h-0 flex-1'} style={L.wlOpen ? { height: L.alH } : undefined}>
          <AlertsPanel alerts={alertsApi.alerts} onDelete={alertsApi.remove} onPick={pickSymbol} onRearm={alertsApi.rearm}
            onClearTriggered={alertsApi.clearTriggered} onClose={() => set({ alOpen: false })} />
        </div>
      )}
    </div>
  );
};

function Terminal({ L, set, indApi }) {
  useMarketTick(2000);
  const alertsApi = useAlerts();
  const [tool, setTool] = useState('cursor');
  const [indOpen, setIndOpen] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const { ind, toggle, setValues, reset } = indApi;
  const startPick = () => { setIndOpen(false); setSettingsId(null); setTool('rdgpick'); };
  const indActions = {
    toggle: (id, on) => toggle(id, on),
    settings: (id) => setSettingsId(id),
    pick: startPick,
  };
  const [symOpen, setSymOpen] = useState(false);
  const [alOpenDlg, setAlOpenDlg] = useState(false);
  const [clearSignal, setClearSignal] = useState(0);
  const pickSymbol = useCallback((s) => set({ symbol: s }), [set]);
  const addAlert = useCallback((p) => alertsApi.add(L.symbol, p), [alertsApi, L.symbol]);
  const clear = async () => {
    if (!window.confirm(`${L.symbol} üzerindeki tüm çizimler silinsin mi?`)) return;
    await api.clearDrawings(L.symbol);
    setClearSignal((n) => n + 1);
  };
  const activeCount = alertsApi.alerts.filter((a) => a.status === 'active').length;

  return (
    <div className="ev-root" data-testid="terminal-root">
      <TopBar symbol={L.symbol} tf={L.tf} setTf={(tf) => set({ tf })} onSymbol={() => setSymOpen(true)} onIndicators={() => setIndOpen(true)}
        onAlert={() => setAlOpenDlg(true)} live={market.live} />
      <div className="ev-main">
        <LeftToolbar tool={tool} setTool={setTool} magnet={L.magnet} setMagnet={(magnet) => set({ magnet })} onClear={clear} />
        <div className="ev-chart-area">
          <Chart symbol={L.symbol} tf={L.tf} tool={tool} setTool={setTool} magnet={L.magnet} alerts={alertsApi.alerts}
            onAddAlert={addAlert} onDeleteAlert={alertsApi.remove} clearSignal={clearSignal} ind={ind} indActions={indActions} />
        </div>
        <SidePanels L={L} set={set} alertsApi={alertsApi} pickSymbol={pickSymbol} />
        <RightStrip wlOpen={L.wlOpen} alOpen={L.alOpen} toggleWl={() => set((l) => ({ wlOpen: !l.wlOpen }))}
          toggleAl={() => set((l) => ({ alOpen: !l.alOpen }))} activeCount={activeCount} />
      </div>
      <IndicatorsDialog open={indOpen} onOpenChange={setIndOpen} ind={ind} onToggle={indActions.toggle} onSettings={(id) => { setIndOpen(false); setSettingsId(id); }} />
      {settingsId && (
        <IndicatorSettings id={settingsId} symbol={L.symbol} ind={ind} onClose={() => setSettingsId(null)} onChange={setValues} onReset={reset} onPick={startPick} onToggle={indActions.toggle} />
      )}
      <SymbolSearch open={symOpen} onOpenChange={setSymOpen} onPick={pickSymbol} />
      <AlertDialog open={alOpenDlg} onOpenChange={setAlOpenDlg} symbol={L.symbol} onCreate={addAlert} />
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);
  const [L, set] = useLayout();
  const indApi = useIndicatorSettings();
  useEffect(() => { market.init().then(() => setReady(true)).catch((e) => setErr(String(e))); }, []);
  return (
    <>
      {ready && L && indApi.ind ? <Terminal L={L} set={set} indApi={indApi} /> : (
        <div className="ev-splash" data-testid="splash">
          <div className="ev-logo h-10 w-10 text-[20px]">E</div>
          <div className="mt-3 text-[15px] text-[#d1d4dc]">Epochveras</div>
          <div className="mt-1 text-[12px] text-[#787b86]">{err ? `Bağlantı hatası: ${err}` : 'Binance vadeli piyasaları yükleniyor…'}</div>
        </div>
      )}
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
