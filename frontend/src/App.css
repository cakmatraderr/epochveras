:root {
  --ev-bg: #000000;
  --ev-panel: #0c0d10;
  --ev-border: #2a2e39;
  --ev-text: #d1d4dc;
  --ev-muted: #787b86;
  --ev-hover: #1e222d;
  --ev-blue: #2962ff;
}

html, body, #root { 
  height: 100%; 
  height: 100dvh; 
  background: #000; 
  overflow: hidden; 
  margin: 0;
  padding: 0;
}
body { font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif; color: var(--ev-text); }
body.ev-resizing, body.ev-resizing * { cursor: col-resize !important; user-select: none !important; }

.ev-root { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: #000; overflow: hidden; }
.ev-splash { height: 100vh; height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; }
.ev-topbar { height: 40px; display: flex; align-items: center; gap: 2px; padding: 0 6px; background: var(--ev-panel); border-bottom: 4px solid #000; flex-shrink: 0; }
.ev-logo { width: 26px; height: 26px; border-radius: 6px; display: grid; place-items: center; background: var(--ev-blue); color: #fff; font-weight: 700; font-size: 14px; }
.ev-sep { width: 1px; height: 22px; background: var(--ev-border); margin: 0 4px; }
.ev-tbtn { display: inline-flex; align-items: center; height: 30px; padding: 0 8px; border-radius: 4px; font-size: 13px; color: var(--ev-text); transition: background-color .12s; white-space: nowrap; }
.ev-tbtn:hover { background: var(--ev-hover); }
.ev-menu { position: absolute; top: 30px; left: 0; z-index: 50; background: #1e222d; border: 1px solid var(--ev-border); border-radius: 4px; padding: 4px 0; min-width: 80px; box-shadow: 0 8px 24px rgba(0,0,0,.6); }
.ev-menu-item { display: block; width: 100%; text-align: left; padding: 6px 14px; font-size: 13px; }
.ev-menu-item:hover { background: #2a2e39; }
.ev-pulse { animation: evpulse 1.6s ease-in-out infinite; }
@keyframes evpulse { 50% { opacity: .35; } }

.ev-main { flex: 1; display: flex; min-height: 0; height: calc(100dvh - 40px); gap: 4px; background: #000; overflow: hidden; }
.ev-lefttools, .ev-rightstrip { width: 46px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 6px; background: var(--ev-panel); }
.ev-toolbtn { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 4px; color: var(--ev-text); transition: background-color .12s, color .12s; }
.ev-toolbtn:hover { background: var(--ev-hover); }
.ev-toolbtn.on { color: var(--ev-blue); background: rgba(41,98,255,.12); }
.ev-badge { position: absolute; top: 3px; right: 2px; min-width: 15px; height: 15px; padding: 0 3px; border-radius: 8px; background: #ff9800; color: #000; font-size: 10px; font-weight: 700; line-height: 15px; }
.ev-iconbtn { display: inline-grid; place-items: center; min-width: 24px; height: 24px; padding: 0 4px; border-radius: 4px; color: var(--ev-muted); transition: color .12s, background-color .12s; }
.ev-iconbtn:hover { background: var(--ev-hover); color: var(--ev-text); }

.ev-chart-area { flex: 1; min-width: 0; min-height: 0; position: relative; background: #000; overflow: hidden; }
.ev-chart-wrap { position: absolute; inset: 0; overflow: hidden; }
.ev-chart-wrap.ev-hit canvas, .ev-chart-wrap.ev-hit td { cursor: pointer !important; }
.ev-overlay { position: absolute; left: 0; top: 0; pointer-events: none; z-index: 3; }
.ev-legend { position: absolute; left: 10px; top: 8px; z-index: 4; pointer-events: none; display: flex; flex-direction: column; gap: 3px; }
.ev-legend b { font-weight: 400; margin-left: 3px; }
.ev-loading { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ev-muted); font-size: 13px; z-index: 5; pointer-events: none; }
.ev-selbar { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 6; display: flex; align-items: center; gap: 4px; padding: 5px 8px; background: #1e222d; border: 1px solid var(--ev-border); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.6); }
.ev-swatch { width: 18px; height: 18px; border-radius: 3px; border: 2px solid transparent; }
.ev-swatch.on { border-color: #fff; }
.ev-wbtn { width: 24px; height: 22px; display: grid; place-items: center; border-radius: 3px; }
.ev-wbtn span { display: block; width: 14px; background: var(--ev-text); }
.ev-wbtn.on, .ev-wbtn:hover { background: #2a2e39; }

.ev-side { position: relative; flex-shrink: 0; display: flex; flex-direction: column; min-width: 0; max-height: 100%; overflow: hidden; background: #000; }
.ev-vresizer { position: absolute; left: -4px; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 10; }
.ev-vresizer:hover, .ev-hresizer:hover { background: rgba(41,98,255,.5); }
.ev-hresizer { height: 4px; flex-shrink: 0; cursor: row-resize; background: #000; }
.ev-panel { background: var(--ev-panel); display: flex; flex-direction: column; min-height: 0; }
.ev-panel-title { height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 12px; font-size: 14px; font-weight: 600; }
.ev-input { width: 100%; height: 30px; border-radius: 4px; background: #000; border: 1px solid var(--ev-border); color: var(--ev-text); font-size: 13px; padding: 0 8px; outline: none; transition: border-color .12s; }
.ev-input:focus { border-color: var(--ev-blue); }

.ev-wl-head { position: sticky; top: 0; z-index: 2; display: flex; height: 26px; background: var(--ev-panel); border-bottom: 1px solid var(--ev-border); font-size: 11px; color: var(--ev-muted); flex-shrink: 0; }
.ev-wl-cell { position: relative; flex-shrink: 0; display: flex; align-items: center; padding: 0 8px; overflow: hidden; white-space: nowrap; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.ev-wl-head .ev-wl-cell { font-size: 11px; }
.ev-wl-cell.r { justify-content: flex-end; }
.ev-col-resizer { position: absolute; right: 0; top: 4px; bottom: 4px; width: 5px; cursor: col-resize; border-right: 1px solid var(--ev-border); }
.ev-col-resizer:hover { border-right: 2px solid var(--ev-blue); }
.ev-wl-row { position: absolute; left: 0; right: 0; height: 26px; display: flex; cursor: pointer; color: var(--ev-text); transition: background-color .1s; }
.ev-wl-row:hover { background: var(--ev-hover); }
.ev-wl-row.on { background: rgba(41,98,255,.16); }

.ev-alert-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px 8px 12px; border-bottom: 1px solid #16181f; cursor: pointer; }
.ev-alert-row:hover { background: var(--ev-hover); }

.ev-dialog { background: #1e222d !important; border: 1px solid var(--ev-border) !important; color: var(--ev-text); }
.ev-dialog > button { color: var(--ev-muted); }

.ev-pane-legend { position: absolute; left: 10px; z-index: 4; pointer-events: none; display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
.ev-atr { pointer-events: none; background: #787B86; color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 2px; font-variant-numeric: tabular-nums; }
.ev-ind-row { display: flex; align-items: center; gap: 6px; font-size: 12px; pointer-events: auto; width: fit-content; padding: 1px 4px 1px 0; border-radius: 3px; }
.ev-ind-row:hover { background: rgba(30,34,45,.85); }
.ev-ind-btn { display: none; place-items: center; height: 18px; min-width: 18px; padding: 0 3px; border-radius: 3px; color: #b2b5be; }
.ev-ind-row:hover .ev-ind-btn { display: inline-grid; }
.ev-ind-btn:hover, .ev-ind-pick:hover { background: #2a2e39; color: #fff; }
.ev-ind-pick { display: inline-flex; align-items: center; gap: 3px; height: 18px; padding: 0 5px; border-radius: 3px; color: #FFEB3B; font-size: 11px; border: 1px solid #FFEB3B55; }
.ev-mtf { position: absolute; z-index: 4; display: flex; gap: 2px; pointer-events: auto; }
.ev-mtf-top { top: 6px; left: 50%; transform: translateX(-50%); flex-direction: column; }
.ev-mtf-cell { font-size: 9px; line-height: 1; padding: 3px 6px; min-width: 30px; text-align: center; color: #fff; border-radius: 2px; font-weight: 600; }
.ev-pick-hint { position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%); z-index: 6; background: #1e222d; border: 1px solid #FFEB3B66; color: #FFEB3B; font-size: 12px; padding: 6px 12px; border-radius: 4px; pointer-events: none; }
.ev-color { width: 30px; height: 24px; padding: 0; border: 1px solid #2a2e39; border-radius: 3px; background: none; cursor: pointer; }
.ev-color::-webkit-color-swatch-wrapper { padding: 2px; }
.ev-color::-webkit-color-swatch { border: none; border-radius: 2px; }

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }
::-webkit-scrollbar-track { background: transparent; }
