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
    if (!ind || !loaded.current) return;
    
    // Eğer kullanıcı değişiklik yapıyorsa local'e ve backend'e debounce ile kaydet
    clearTimeout(timer.current);
    saving.current = true;
    timer.current = setTimeout(() => {
      api.putSetting('indicators', ind).finally(() => {
        saving.current = false;
      });
    }, 400);
  }, [ind]);

  const toggle = (id, enabled) => setInd((s) => ({ ...s, [id]: { ...s[id], enabled } }));
  const setValues = (id, patch) => setInd((s) => ({ ...s, [id]: { ...s[id], values: { ...s[id].values, ...patch } } }));
  const reset = (id) => setInd((s) => ({ ...s, [id]: { ...s[id], values: { ...defaultsOf(id) } } }));

  return [ind, toggle, setValues, reset];
}
