# Epochveras — PRD

## Problem statement (original, TR)
TradingView benzeri, biraz daha basit veri terminali "Epochveras". Binance USDⓈ-M perpetual paritelerinin hepsi canlı izleme listesinde (Sembol | Fiyat | Değ% | 24s Hacim K/M/B | Funding (Xs)). İzleme listesi + alarm paneli sağda, açılır/kapanır, kenardan genişletilebilir, sütunlar genişletilebilir. TradingView ikon şeridi. Fiyat ölçeğinin yanındaki + ile tek tıkla alarm, alarm çizgisi + ölçekte ok işareti (oktan silme). Tam hassas fiyat ölçeği (tr formatı). Göstergeler penceresi (kodlar sonra verilecek). Sol üstte A/Y/D/K. ≥5000 mum. UTC+3 (günlük 03:00). Çizimler: alış/satış pozisyonu, yatay ışın, trend çizgisi, cetvel, mıknatıs — tüm zaman dilimlerinde doğru görünmeli. Siyah kanvas.

## User choices
- Göstergeler penceresi şimdilik boş
- Alarm bildirimi: ekranda bildirim + ses + tarayıcı bildirimi
- Saklama: sunucuda, girişsiz (tek kullanıcı)

## Architecture
- Frontend: React + lightweight-charts v5, overlay canvas for drawings/alarms/plus button/ruler. Drawings stored in real UTC seconds + price, mapped via fractional logical index → timeframe independent.
- Market data: browser → fapi.binance.com direct; fallback to backend proxy `/api/binance/*` (www.binance.com/fapi). Live via Binance WS (!ticker@arr, !markPrice@arr@1s, kline), polling fallback.
- Backend FastAPI + Mongo: drawings, alerts, settings(layout).

## Implemented (2026-06)
- Full terminal UI, watchlist (virtualized, sortable, searchable, resizable cols), alerts panel, right strip, top bar timeframes, symbol search, indicators dialog (empty), alert dialog
- 6000 bars initial + lazy older loading, Istanbul time
- Drawing tools + selection toolbar (color/width/delete), Delete key, magnet, ruler
- One-click alarms (+), alarm lines/tags with delete, client-side trigger (toast+sound+notification)

## Backlog
- P0 (done 2026-06): User's Pine indicators — RDG (per-symbol box), Pivot bar color, EMA 1/2, dual Trendlines, EMA cross + arrows, SFP, MTF SFP table (top center), MTF pivot table (bottom right); all inputs editable, saved in settings 'indicators'
- Not ported: SFP LTF volume validation (request.security_lower_tf), unused inputs (sae/sce/st/def/sl, dashboard)
- P1: Server-side alarm monitoring (works while page closed), drag alarm lines to move
- P2: More drawing styles, multi-chart layouts
