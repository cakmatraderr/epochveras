import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { INDICATORS, defaultIndicatorState, defaultsOf } from '../lib/indicators/defs';

export function useIndicatorSettings() {
  const [ind, setInd] = useState(null);
  const loaded = useRef(false);
  const timer = useRef();
  const saving = useRef(false);

  useEffect(() => {
    // İlk yüklemede kaydedilmiş ayarları al
    api.getSetting('indicators').then((v) => {
      loaded.current = true;
      const base = defaultIndicatorState();
      if (v) {
        Object.entries(v).forEach(([id, st]) => {
          if (base[id]) {
            base[id] = { 
              enabled: st.enabled ?? base[id].enabled, 
              values: { ...base[id].values, ...(st.values || {}) } 
            };
          }
        });
      }
      setInd(base);
    }).catch(() => setInd(defaultIndicatorState()));
  }, []);

  useEffect(() => {
    if (!ind || !loaded.
