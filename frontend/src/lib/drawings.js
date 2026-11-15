function renderPosition(ctx, d, g, prec, active) {
  const { x1, x2, yE, yT, yS } = posGeom(d, g);
  if ([yE, yT, yS].some((v) => v == null)) return;
  const L = Math.min(x1, x2);
  const W = Math.abs(x2 - x1);

  // --- ŞABLONUN KENDİ KONUMUNA GÖRE DİNAMİK RENK ---
  // Long şablonunda TP (Hedef) yukarıda, SL (Zarar) aşağıdadır. 
  // Şablon grafik üzerinde sürüklendikçe giriş seviyesinin üstünde kalan alan kâr (yeşil), altında kalan alan zarar (kırmızı) olur.
  // Burada anlık fiyat yerine doğrudan şablonun yönüne ve hedef fiyatına göre aktif dolgu tonunu ayarlıyoruz:
  const isUpTarget = d.tp < d.entry; // Long için hedef yukarıdaysa (y koordinatı olarak küçükse)
  
  // Şablon sürüklenirken veya aktifken TradingView tarzı canlı kontrast
  ctx.fillStyle = 'rgba(8,153,129,0.28)'; // Kâr bölgesi yeşil
  ctx.fillRect(L, Math.min(yE, yT), W, Math.abs(yT - yE));
  
  ctx.fillStyle = 'rgba(242,54,69,0.28)'; // Zarar bölgesi kırmızı
  ctx.fillRect(L, Math.min(yE, yS), W, Math.abs(yS - yE));
  // --------------------------------------------------

  line(ctx, L, yE, L + W, yE, '#787b86', 1);
  if (!active) return;
  const cx = L + W / 2;
  const pT = ((d.tp - d.entry) / d.entry) * 100;
  const pS = ((d.sl - d.entry) / d.entry) * 100;
  const rr = Math.abs(d.tp - d.entry) / (Math.abs(d.entry - d.sl) || 1e-12);
  const tUp = yT < yS;
  box(ctx, [`Hedef: ${fmtPrice(d.tp, prec)} (${fmtPct(pT)})`], cx, tUp ? yT - 4 : yT + 4, GREEN, tUp ? 'bottom' : 'top');
  box(ctx, [`Zarar Durdur: ${fmtPrice(d.sl, prec)} (${fmtPct(pS)})`], cx, tUp ? yS + 4 : yS - 4, RED, tUp ? 'top' : 'bottom');
  box(ctx, [`${d.type === 'long' ? 'Alış' : 'Satış'} · Giriş ${fmtPrice(d.entry, prec)} · R/Ö ${rr.toFixed(2)}`], cx, yE + (tUp ? 4 : -4), '#363a45', tUp ? 'top' : 'bottom');
  handle(ctx, x1, yT);
  handle(ctx, x1, yS);
  handle(ctx, x1, yE);
  handle(ctx, x2, yE);
}
