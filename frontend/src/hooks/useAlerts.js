import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { market } from '../lib/market';
import { fmtPrice } from '../lib/format';

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((d) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.2);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.22);
    });
  } catch { /* audio unavailable */ }
}

function notify(a) {
  const prec = market.info[a.symbol]?.precision ?? 2;
  const msg = `${a.symbol} ${a.direction === 'up' ? 'yukarı' : 'aşağı'} kesti: ${fmtPrice(a.price, prec)}`;
  toast.warning('Alarm tetiklendi', { description: msg, duration: 15000 });
  beep();
  if ('Notification' in window && Notification.permission === 'granted') new Notification('Epochveras alarm', { body: msg });
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const ref = useRef([]);
  ref.current = alerts;

  useEffect(() => { api.alerts().then(setAlerts); }, []);

  useEffect(() => market.subscribe(() => {
    ref.current.forEach((a) => {
      if (a.status !== 'active' || a.firing) return;
      const last = market.tickers[a.symbol]?.last;
      if (last == null) return;
      if ((a.direction === 'up' && last >= a.price) || (a.direction === 'down' && last <= a.price)) {
        a.firing = true;
        const triggered_at = new Date().toISOString();
        notify(a);
        
        // Tüm objelerin referansını yenileyerek React'in arayüzü anında güncellemesini zorunlu kılıyoruz
        setAlerts((xs) => 
          xs.map((x) => (x.id === a.id ? { ...x, status: 'triggered', triggered_at } : { ...x }))
        );
        
        api.patchAlert(a.id, { status: 'triggered', triggered_at });
      }
    });
  }), []);

  const add = useCallback(async (symbol, price) => {
    const last = market.tickers[symbol]?.last ?? price;
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    const a = await api.createAlert({ symbol, price, direction: price >= last ? 'up' : 'down' });
    setAlerts((xs) => [a, ...xs]);
    toast.success('Alarm kuruldu', { description: `${symbol} · ${fmtPrice(price, market.info[symbol]?.precision ?? 2)}` });
  }, []);

  const remove = useCallback((id) => {
    setAlerts((xs) => xs.filter((x) => x.id !== id));
    api.deleteAlert(id);
  }, []);

  const rearm = useCallback(async (a) => {
    const last = market.tickers[a.symbol]?.last ?? a.price;
    const upd = await api.patchAlert(a.id, { status: 'active', direction: a.price >= last ? 'up' : 'down' });
    setAlerts((xs) => xs.map((x) => (x.id === a.id ? upd : x)));
  }, []);

  const clearTriggered = useCallback(() => {
    ref.current.filter((a) => a.status !== 'active').forEach((a) => api.deleteAlert(a.id));
    setAlerts((xs) => xs.filter((x) => x.status === 'active'));
  }, []);

  return { alerts, add, remove, rearm, clearTriggered };
}
