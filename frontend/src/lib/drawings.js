import { fmtPrice, fmtPct, fmtDur } from './format';

const GREEN = '#089981';
const RED = '#f23645';
const BLUE = '#2962ff';
const ALERT = '#ff9800';
const FONT = '12px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';

const handle = (ctx, x, y) => {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = BLUE;
  ctx.stroke();
};

const box = (ctx, lines, cx, y, bg, anchor = 'top') => {
  ctx.font = FONT;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const h = lines.length * 16 + 8;
  const top = anchor === 'top' ? y : y - h;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, top, w, h, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, cx, top + 12 + i * 16));
};

const line = (ctx, x1, y1, x2, y2, color, width, dash = []) => {
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
};

function posGeom(d, g) {
  return { x1: g.tx(d.t1), x2: g.tx(d.t2), yE: g.py(d.entry), yT: g.py(d.tp), yS: g.py(d.sl) };
}

function renderPosition(ctx, d, g, prec, active) {
  const { x1, x2, yE, yT, yS } = posGeom(d, g);
  if ([yE, yT, yS].some((v) => v == null)) return;
  const L = Math.min(x1, x2);
  const W = Math.abs(x2 - x1);
  ctx.fillStyle = 'rgba(8,153,129,0.22)';
  ctx.fillRect(L, Math.min(yE, yT), W, Math.abs(yT - yE));
  ctx.fillStyle = 'rgba(242,54,69,0.22)';
  ctx.fillRect(L, Math.min(yE, yS), W, Math.abs(yS - yE));
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

export function renderDrawing(ctx, d, g, prec, active) {
  if (d.type === 'trend') {
    const x1 = g.tx(d.p1.t); const y1 = g.py(d.p1.p);
    const x2 = g.tx(d.p2.t); const y2 = g.py(d.p2.p);
    if (y1 == null || y2 == null) return;
    line(ctx, x1, y1, x2, y2, d.color, d.width);
    if (active) { handle(ctx, x1, y1); handle(ctx, x2, y2); }
  } else if (d.type === 'hray') {
    const x1 = g.tx(d.p1.t); const y1 = g.py(d.p1.p);
    if (y1 == null) return;
    line(ctx, x1, y1, g.paneW, y1, d.color, d.width);
    if (active) {
      handle(ctx, x1, y1);
      ctx.font = FONT;
      const txt = fmtPrice(d.p1.p, prec);
      const w = ctx.measureText(txt).width + 10;
      ctx.fillStyle = d.color;
      ctx.fillRect(g.paneW - w - 24, y1 - 9, w, 18);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, g.paneW - w / 2 - 24, y1);
    }
  } else if (d.type === 'long' || d.type === 'short') {
    renderPosition(ctx, d, g, prec, active);
  }
}

const near = (ax, ay, bx, by, r = 7) => Math.hypot(ax - bx, ay - by) <= r;
const segDist = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1; const dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

export function hitDrawing(d, g, x, y) {
  if (d.type === 'trend') {
    const x1 = g.tx(d.p1.t); const y1 = g.py(d.p1.p);
    const x2 = g.tx(d.p2.t); const y2 = g.py(d.p2.p);
    if (near(x, y, x1, y1)) return 'p1';
    if (near(x, y, x2, y2)) return 'p2';
    return segDist(x, y, x1, y1, x2, y2) <= 5 ? 'body' : null;
  }
  if (d.type === 'hray') {
    const x1 = g.tx(d.p1.t); const y1 = g.py(d.p1.p);
    if (near(x, y, x1, y1)) return 'p1';
    return Math.abs(y - y1) <= 5 && x >= x1 ? 'body' : null;
  }
  const { x1, x2, yE, yT, yS } = posGeom(d, g);
  if (near(x, y, x1, yT)) return 'tp';
  if (near(x, y, x1, yS)) return 'sl';
  if (near(x, y, x1, yE)) return 'entry';
  if (near(x, y, x2, yE)) return 'right';
  const top = Math.min(yT, yS); const bot = Math.max(yT, yS);
  return x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= top && y <= bot ? 'body' : null;
}

export function renderRuler(ctx, r, g, prec) {
  const xa = g.tx(r.a.t); const ya = g.py(r.a.p);
  const xb = g.tx(r.b.t); const yb = g.py(r.b.p);
  if (ya == null || yb == null) return;
  const up = r.b.p >= r.a.p;
  const col = up ? BLUE : RED;
  ctx.fillStyle = up ? 'rgba(41,98,255,0.2)' : 'rgba(242,54,69,0.2)';
  ctx.fillRect(Math.min(xa, xb), Math.min(ya, yb), Math.abs(xb - xa), Math.abs(yb - ya));
  const mx = (xa + xb) / 2; const my = (ya + yb) / 2;
  line(ctx, mx, ya, mx, yb, col, 1);
  line(ctx, xa, my, xb, my, col, 1);
  const arrow = (x, y, dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dx * 6 - dy * 4, y - dy * 6 - dx * 4);
    ctx.lineTo(x - dx * 6 + dy * 4, y - dy * 6 + dx * 4);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  };
  if (Math.abs(yb - ya) > 12) arrow(mx, yb, 0, Math.sign(yb - ya));
  if (Math.abs(xb - xa) > 12) arrow(xb, my, Math.sign(xb - xa), 0);
  const dp = r.b.p - r.a.p;
  const bars = Math.round((r.b.t - r.a.t) / g.iv);
  const lines = [`${dp >= 0 ? '' : '−'}${fmtPrice(Math.abs(dp), prec)} (${fmtPct((dp / r.a.p) * 100)})`, `${bars} çubuk, ${fmtDur(r.b.t - r.a.t)}`];
  if (up) box(ctx, lines, mx, Math.min(ya, yb) - 6, col, 'bottom');
  else box(ctx, lines, mx, Math.max(ya, yb) + 6, col, 'top');
}

export const alarmHit = (tags, g, x, y) => {
  if (x < g.paneW - 22 || x > g.paneW) return null;
  return tags.find((a) => { const yy = g.py(a.price); return yy != null && Math.abs(y - yy) <= 8; }) || null;
};

export function renderAlarms(ctx, tags, g, hoverId) {
  tags.forEach((a) => {
    const y = g.py(a.price);
    if (y == null || y < 0 || y > g.paneH) return;
    const x0 = g.paneW - 22;
    ctx.beginPath();
    ctx.moveTo(x0, y - 8);
    ctx.lineTo(g.paneW - 7, y - 8);
    ctx.lineTo(g.paneW, y);
    ctx.lineTo(g.paneW - 7, y + 8);
    ctx.lineTo(x0, y + 8);
    ctx.closePath();
    ctx.fillStyle = hoverId === a.id ? RED : ALERT;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    const cx = x0 + 7;
    if (hoverId === a.id) {
      line(ctx, cx - 3.5, y - 3.5, cx + 3.5, y + 3.5, '#fff', 1.5);
      line(ctx, cx + 3.5, y - 3.5, cx - 3.5, y + 3.5, '#fff', 1.5);
    } else {
      ctx.beginPath();
      ctx.arc(cx, y, 4, 0, Math.PI * 2);
      ctx.stroke();
      line(ctx, cx, y, cx, y - 2.5, '#fff', 1.2);
      line(ctx, cx, y, cx + 2, y, '#fff', 1.2);
    }
  });
}

export const plusHit = (cross, g, x, y) => cross && x >= g.paneW - 22 && x <= g.paneW && Math.abs(y - cross.y) <= 9;

export function renderPlus(ctx, cross, g, hover) {
  const cx = g.paneW - 11;
  ctx.beginPath();
  ctx.arc(cx, cross.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = hover ? BLUE : '#2a2e39';
  ctx.fill();
  line(ctx, cx - 4.5, cross.y, cx + 4.5, cross.y, '#fff', 1.5);
  line(ctx, cx, cross.y - 4.5, cx, cross.y + 4.5, '#fff', 1.5);
}
