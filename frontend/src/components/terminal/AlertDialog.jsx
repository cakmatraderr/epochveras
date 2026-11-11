import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { market } from '../../lib/market';

export const AlertDialog = ({ open, onOpenChange, symbol, onCreate }) => {
  const [price, setPrice] = useState('');
  useEffect(() => {
    if (open) {
      const t = market.tickers[symbol];
      setPrice(t ? String(t.last).replace('.', ',') : '');
    }
  }, [open, symbol]);
  const submit = () => {
    const v = parseFloat(price.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(v) && v > 0) { onCreate(v);
      onOpenChange(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ev-dialog max-w-[380px] gap-4 p-5" data-testid="alert-create-dialog">
        <DialogHeader><DialogTitle className="text-[17px] text-[#d1d4dc]">{symbol} için alarm oluştur</DialogTitle></DialogHeader>
        <label className="text-[12px] text-[#787b86]">Koşul: Fiyat seviyeyi kestiğinde
          <input value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="ev-input mt-2 h-9 tabular-nums" data-testid="alert-price-input" />
        </label>
        <button type="button" onClick={submit} className="h-9 rounded bg-[#2962ff] text-[14px] font-medium text-white hover:bg-[#1e53e5]" data-testid="alert-create-submit">
          Oluştur
        </button>
      </DialogContent>
    </Dialog>
  );
};