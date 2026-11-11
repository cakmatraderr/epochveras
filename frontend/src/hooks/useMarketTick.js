import { useEffect, useState } from 'react';
import { market } from '../lib/market';

export function useMarketTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    let pending = false;
    let timer;
    const un = market.subscribe(() => {
      if (pending) return;
      pending = true;
      timer = setTimeout(() => { pending = false; set((n) => n + 1); }, ms);
    });
    return () => { un(); clearTimeout(timer); };
  }, [ms]);
}
