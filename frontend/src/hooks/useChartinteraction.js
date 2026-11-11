import { useEffect } from 'react';
import { geom, pointAt } from '../lib/chartGeom';
import { renderDrawing, hitDrawing, renderRuler, renderAlarms, alarmHit, plusHit, renderPlus } from '../lib/drawings';
import { api } from '../lib/api';
import { renderIndicators, renderPick } from '../lib/indicators/render';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const clone = (o) => JSON.parse(JSON.stringify(o));

function applyDrag(R, g, x, y) {
  const { drag } = R;
  const d = R.drawings.find((v) => v.id === drag.id);
  if (!d) return;
  const cur = pointAt(R, g, x, y);
  const raw = pointAt(R, g, x, y, false);
  const dt = raw.t - drag.start.t;
  const dp = raw.p - drag.start.p;
  const o = drag.orig;
  const h = drag.handle;
  if (d.type === 'trend') {
    if (h === 'p1' || h === 'p2') d[h] = cur;
    else { d.p1 = { t: o.p1.t + dt, p: o.p1.p + dp }; d.p2 = { t: o.p2.t + dt, p: o.p2.p + dp }; }
  } else if (d.type === 'hray') {
    d.p1 = h === 'p1' ? cur : { t: o.p1.t + dt, p: o.p1.p + dp };
  } else if (h === 'tp') d.tp = cur.p;
  else if (h === 'sl') d.sl = cur.p;
  else if (h === 'entry') { d.entry = cur.p; d.t1 = Math.min(cur.t, d.t2 - g.iv); }
  else if (h === 'right') d.t2 = Math.max(cur.t, d.t1 + g.iv);
  else Object.assign(d, { t1: o.t1 + dt, t2: o.t2 + dt, entry: o.entry + dp, tp: o.tp + dp, sl: o.sl + dp });
}

function findHit(R, g, x, y) {
  for (let i = R.drawings.length - 1; i >= 0; i -= 1) {
    const h = hitDrawing(R.drawings[i], g, x, y);
    if (h) return { d: R.drawings[i], handle: h };
  }
  return null;
}

export function useChartInteraction(R, wrap, canvas, cb) {
  useEffect(() => {
    R.cb = cb;
  });

  useEffect(() => {
    const el = wrap.current;
    const rel = (e) => {
      const r = R.box.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const select = (id) => { R.sel = id; R.cb.onSelect(id); };
    const commit = (d) => {
      d.symbol = R.symbol;
      delete d.downX; delete d.downY; delete d.dragging;
      R.drawings.push(d);
      R.draft = null;
      api.saveDrawing(d);
      select(d.id);
      R.cb.setTool('cursor');
    };

    const handleDown = (x, y, g) => {
      const tool = R.tool;
      if (R.ruler && R.ruler.done) { R.ruler = null; if (tool === 'ruler') R.cb.setTool('cursor'); return true; }
      if (tool === 'rdgpick') {
        const p = pointAt(R, g, x, y);
        if (!R.pick) R.pick = p;
        else { R.cb.onRdgPick(R.pick, p); R.pick = null; R.cb.setTool('cursor'); }
        return true;
      }
      if (tool === 'ruler') {
        const p = pointAt(R, g, x, y);
        if (!R.ruler) R.ruler = { a: p, b: p };
        else { R.ruler.b = p; R.ruler.done = true; }
        return true;
      }
      if (tool === 'trend') {
        const p = pointAt(R, g, x, y);
        if (!R.draft) R.draft = { id: uid(), type: 'trend', p1: p, p2: { ...p }, color: '#2962ff', width: 2, downX: x, downY: y, dragging: true };
        else commit(R.draft);
        return true;
      }
      if (tool === 'hray') { commit({ id: uid(), type: 'hray', p1: pointAt(R, g, x, y), color: '#2962ff', width: 1 }); return true; }
      if (tool === 'long' || tool === 'short') {
        const p = pointAt(R, g, x, y);
        const s = tool === 'long' ? 1 : -1;
        commit({ id: uid(), type: tool, t1: p.t, t2: p.t + 30 * g.iv, entry: p.p, tp: g.yp(y - 70 * s), sl: g.yp(y + 40 * s) });
        return true;
      }
      const tag = alarmHit(R.alertTags || [], g, x, y);
      if (tag) { R.cb.onDeleteAlert(tag.id); return true; }
      if (plusHit(R.cross, g, x, y)) {
        const p = Math.round(g.yp(R.cross.y) / R.tick) * R.tick;
        R.cb.onAddAlert(+p.toFixed(R.prec));
        return true;
      }
      const hit = findHit(R, g, x, y);
      if (hit) {
        select(hit.d.id);
        R.drag = { id: hit.d.id, handle: hit.handle, orig: clone(hit.d), start: pointAt(R, g, x, y, false), moved: false };
        return true;
      }
      if (R.sel) select(null);
      return false;
    };

    const onPointerDown = (e) => {
      R.swallow = false;
      if (e.button !== 0 || !R.chart || e.target.closest('.ev-selbar, .ev-ind-row, .ev-mtf')) return;
      const g = geom(R);
      if (!g) return;
      const { x, y } = rel(e);
      if (x < 0 || y < 0 || x > g.paneW || y > g.paneH) return;
      R.swallow = handleDown(x, y, g);
      if (R.swallow) { e.stopPropagation(); e.preventDefault(); }
    };
    const swallow = (e) => { if (R.swallow) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); } };

    const onMove = (e) => {
      const g = R.chart && geom(R);
      if (!g) return;
      const { x, y } = rel(e);
      if (R.drag) { R.drag.moved = true; applyDrag(R, g, x, y); return; }
      if (R.draft) R.draft.p2 = pointAt(R, g, x, y);
      if (R.ruler && !R.ruler.done) R.ruler.b = pointAt(R, g, x, y);
      if (R.pick) R.pickCur = pointAt(R, g, x, y);
      let hit = false;
      R.hoverAlarm = null; R.plusHover = false; R.hover = null;
      if (R.tool === 'cursor' && x <= g.paneW && y <= g.paneH && x >= 0 && y >= 0) {
        const tag = alarmHit(R.alertTags || [], g, x, y);
        R.hoverAlarm = tag ? tag.id : null;
        R.plusHover = !tag && !!plusHit(R.cross, g, x, y);
        const h = !tag && !R.plusHover && findHit(R, g, x, y);
        R.hover = h ? h.d.id : null;
        hit = !!(tag || R.plusHover || h);
      }
      el.classList.toggle('ev-hit', hit);
      el.classList.toggle('ev-draw', R.tool !== 'cursor');
    };

    const onUp = (e) => {
      if (R.drag) {
        const d = R.drawings.find((v) => v.id === R.drag.id);
        if (d && R.drag.moved) api.saveDrawing(d);
        R.drag = null;
      } else if (R.draft && R.draft.dragging) {
        R.draft.dragging = false;
        const { x, y } = rel(e.changedTouches ? e.changedTouches[0] : e);
        if (Math.hypot(x - R.draft.downX, y - R.draft.downY) > 8) commit(R.draft);
      }
    };

    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') { R.draft = null; R.ruler = null; R.pick = null; R.cb.setTool('cursor'); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && R.sel) R.cb.deleteDrawing(R.sel);
    };

    el.addEventListener('pointerdown', onPointerDown, true);
    el.addEventListener('mousedown', swallow, true);
    el.addEventListener('touchstart', swallow, true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);

    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvas.current;
      if (!c || !R.box) return;
      const dpr = window.devicePixelRatio || 1;
      const w = R.box.clientWidth; const h = R.box.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        c.style.width = `${w}px`; c.style.height = `${h}px`;
      }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const g = R.chart && geom(R);
      if (!g) return;
      renderIndicators(ctx, R, g);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, g.paneW, g.paneH);
      ctx.clip();
      renderPick(ctx, R, g);
      R.drawings.forEach((d) => renderDrawing(ctx, d, g, R.prec, d.id === R.sel || d.id === R.hover));
      if (R.draft) renderDrawing(ctx, R.draft, g, R.prec, true);
      if (R.ruler) renderRuler(ctx, R.ruler, g, R.prec);
      renderAlarms(ctx, R.alertTags || [], g, R.hoverAlarm);
      if (R.cross && R.cross.y < g.paneH && R.tool === 'cursor' && !R.hoverAlarm && !R.drag) renderPlus(ctx, R.cross, g, R.plusHover);
      ctx.restore();
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onPointerDown, true);
      el.removeEventListener('mousedown', swallow, true);
      el.removeEventListener('touchstart', swallow, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [R, wrap, canvas]);
}
