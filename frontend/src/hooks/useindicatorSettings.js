import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { INDICATORS, defaultIndicatorState, defaultsOf } from '../lib/indicators/defs';

export function useIndicatorSettings() {
  const [ind, setInd] = useState(null);
  const loaded = useRef(false);
  const timer = useRef();
  const skip = useRef(false);
  useEffect(() => {
    const load = (first) => api.getSetting('indicators').then((v) => {
      if (!first) skip.current = true;
      loaded.current = true;
      const base = defaultIndicatorState();
      Object.entries(v || {}).forEach(([id, st]) => { if (base[id]) base[id] = { enabled: st.enabled, values: { ...base[id].values, ...st.values } }; });
      setInd(base);
    });
    load(true).catch(() => setInd(defaultIndicatorState()));
    const onFocus = () => load(false).catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  useEffect(() => {
    if (!ind || !loaded.current) return;
    if (skip.current) { skip.current = false; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => api.putSetting('indicators', ind), 500);
  }, [ind]);

  const toggle = (id, enabled) => setInd((s) => ({ ...s, [id]: { ...s[id], enabled } }));
  const setValues = (id, patch) => setInd((s) => ({ ...s, [id]: { ...s[id], values: { ...s[id].values, ...patch } } }));
  const reset = (id) => setInd((s) => ({ ...s, [id]: { ...s[id], values: { ...defaultsOf(INDICATORS.find((d) => d.id === id)), boxes: s[id].values.boxes } } }));
  return { ind, toggle, setValues, reset };
}
