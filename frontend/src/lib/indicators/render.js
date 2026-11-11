import { OFFSET } from '../format';

const FONT = (px) => `${px}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif`;

function renderFill(ctx, f, R, g, cx) {
  const r = R.chart.timeScale().getVisibleLogicalRange();
  if (!r) return;
  const bars = R.bars;
  const from = Math.max(0, Math.floor(r.from) - 1); const to = Math.min(bars.length - 1, Math.ceil(r.to) + 1);
  const paths = new Map();
  for (let i = from; i < to; i += 1) {
    const a0 = f.a[i]; const a1 = f.a[i + 1]; const b0 = f.b[i]; const b1 = f.b[i + 1];
    if (a0 == null || a1 == null || b0 == null || b1 == null) continue;
    const col = f.colorAt ? f.colorAt(i) : f.color;
    if (!paths.has(col)) paths.set(col, new Path2D());
    const p = paths.get(col);
    const x0 = cx(bars[i].time); const x1 = cx(bars[i + 1].time);
    p.moveTo(x0, g.py(a0)); p.lineTo(x1, g.py(a1)); p.lineTo(x1, g.py(b1)); p.lineTo(x0, g.py(b0)); p.closePath();
  }
  paths.forEach((p, col) => { ctx.fillStyle = col; ctx.fill(p); });
}

function renderLabel(ctx, lb, x, y) {
  if (y == null) return;
  if (lb.style === 'circle') {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = lb.color; ctx.fill();
    return;
  }
  const px = lb.size === 'tiny' ? 10 : 12;
  ctx.font = FONT(px);
  const lines = String(lb.text).split('\n');
  const w = Math.max(...lines.map((s) => ctx.measureText(s).width)) + 8;
  const h = lines.length * (px + 2) + 4;
  const down = lb.style === 'down';
  const top = down ? y - 6 - h : y + 6;
  if (lb.color) {
    ctx.fillStyle = lb.color;
    ctx.beginPath(); ctx.roundRect(x - w / 2, top, w, h, 2); ctx.fill();
    ctx.beginPath();
    if (down) { ctx.moveTo(x - 4, top + h); ctx.lineTo(x + 4, top + h); ctx.lineTo(x, y - 1); } else { ctx.moveTo(x - 4, top); ctx.lineTo(x + 4, top); ctx.lineTo(x, y + 1); }
    ctx.fill();
  }
  ctx.fillStyle = lb.textColor || '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((s, i) => ctx.fillText(s, x, top + 2 + (px + 2) * i + (px + 2) / 2));
}

function renderShape(ctx, s, x, g) {
  const y0 = g.py(s.p);
  if (y0 == null) return;
  const up = s.kind === 'up';
  const y = up ? y0 + 6 : y0 - 6;
  const d = up ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 5, y + 6 * d); ctx.lineTo(x + 2, y + 6 * d); ctx.lineTo(x + 2, y + 13 * d);
  ctx.lineTo(x - 2, y + 13 * d); ctx.lineTo(x - 2, y + 6 * d); ctx.lineTo(x - 5, y + 6 * d);
  ctx.closePath();
  ctx.fillStyle = s.color; ctx.fill();
}

function paneGeom(R, g, o, id) {
  if (!o.pane) return { g, top: 0, h: g.paneH };
  const s = R.indSeries.get(`${id}:${o.lines[0].key}`);
  const panes = R.chart.panes();
  const el = panes[o.pane] && panes[o.pane].getHTMLElement();
  if (!s || !el) return null;
  const top = el.getBoundingClientRect().top - R.box.getBoundingClientRect().top;
  const py = (p) => { const y = s.priceToCoordinate(p); return y == null ? null : y + top; };
  return { g: { ...g, py }, top, h: panes[o.pane].getHeight() };
}

export function renderIndicators(ctx, R, gMain) {
  const outs = R.indOut;
  if (!outs) return;
  const cx = (t) => gMain.tx(t - OFFSET);
  Object.entries(outs).forEach(([id, o]) => {
    const pg = paneGeom(R, gMain, o, id);
    if (!pg) return;
    const { g } = pg;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, pg.top, g.paneW, pg.h); ctx.clip();
    (o.bands || []).forEach((b) => {
      const y1 = g.py(b.p1); const y2 = g.py(b.p2);
      if (y1 == null || y2 == null) return;
      ctx.fillStyle = b.color; ctx.fillRect(0, Math.min(y1, y2), g.paneW, Math.abs(y2 - y1));
    });
    (o.hlines || []).forEach((hl) => {
      const y = g.py(hl.p);
      if (y == null) return;
      ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.moveTo(0, y); ctx.lineTo(g.paneW, y);
      ctx.strokeStyle = hl.color; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    });
    (o.boxes || []).forEach((b) => {
      const x1 = cx(b.t1); const x2 = cx(b.t2); const y1 = g.py(b.p1); const y2 = g.py(b.p2);
      if (y1 == null || y2 == null) return;
      ctx.fillStyle = b.fill; ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.strokeStyle = b.border; ctx.lineWidth = b.width; ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    });
    (o.fills || []).forEach((f) => renderFill(ctx, f, R, g, cx));
    (o.segs || []).forEach((s) => {
      const y1 = g.py(s.p1); const y2 = g.py(s.p2);
      if (y1 == null || y2 == null) return;
      const x1 = cx(s.t1); const x2 = cx(s.t2);
      let ex = x2; let ey = y2;
      if (s.extend && x2 !== x1) { ex = g.paneW; ey = y1 + ((y2 - y1) * (ex - x1)) / (x2 - x1); }
      ctx.beginPath(); ctx.setLineDash(s.dash || []);
      ctx.moveTo(x1, y1); ctx.lineTo(ex, ey);
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1; ctx.stroke();
      ctx.setLineDash([]);
    });
    (o.shapes || []).forEach((s) => renderShape(ctx, s, cx(s.t), g));
    (o.labels || []).forEach((lb) => renderLabel(ctx, lb, cx(lb.t), g.py(lb.p)));
    ctx.restore();
  });
}

export function renderPick(ctx, R, g) {
  if (!R.pick || !R.pickCur) return;
  const x1 = g.tx(R.pick.t); const y1 = g.py(R.pick.p); const x2 = g.tx(R.pickCur.t); const y2 = g.py(R.pickCur.p);
  ctx.setLineDash([4, 4]); ctx.strokeStyle = '#FFEB3B'; ctx.lineWidth = 1;
  ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  ctx.setLineDash([]);
}
