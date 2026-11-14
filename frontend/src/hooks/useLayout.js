import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const DEFAULT = {
  symbol: 'BTCUSDT', tf: '15m', wlOpen: true, alOpen: true, sideW: 470, alH: 240, crsiH: 150, cols: [112, 96, 66, 78, 112], magnet: false,
};

export function useLayout() {
  const [layout, setLayout] = useState(null);
  const timer = useRef();
  const loaded = useRef(false);
  useEffect(() => {
    api.getSetting('layout').then((v) => { loaded.current = true; setLayout({ ...DEFAULT, ...(v || {}) }); }).catch(() => setLayout(DEFAULT));
  }, []);
  useEffect(() => {
    if (!layout || !loaded.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => api.putSetting('layout', layout), 600);
  }, [layout]);
  const set = (patch) => setLayout((l) => ({ ...l, ...(typeof patch === 'function' ? patch(l) : patch) }));
  return [layout, set];
}

export function useDrag(onDelta) {
  return (e) => {
    e.preventDefault();
    let last = { x: e.clientX, y: e.clientY };
    document.body.classList.add('ev-resizing');
    const move = (ev) => { onDelta(ev.clientX - last.x, ev.clientY - last.y); last = { x: ev.clientX, y: ev.clientY }; };
    const up = () => {
      document.body.classList.remove('ev-resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
}
