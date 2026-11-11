import { computeEma2, computeEmaCross, computePivotBars } from './basic';
import { computeTrendlines } from './trendlines';
import { computeSfp } from './sfp';
import { computeRdg } from './rdg';
import { PC } from './color';
import { computeCrsi, PINE_COLORS } from './crsi';

const W = (k, l, d, g = 'Stil') => ({ k, l, t: 'width', d, g });
const C = (k, l, d, g = 'Stil') => ({ k, l, t: 'color', d, g });
const B = (k, l, d, g) => ({ k, l, t: 'bool', d, g });
const I = (k, l, d, g, min, max, step) => ({ k, l, t: 'int', d, g, min, max, step });

export const INDICATORS = [
  { id: 'rdgpack', name: 'RSI-Divergence Goggles [Trendoscope®]', short: 'RDG', master: true, inputs: [] },
  {
    id: 'crsi', name: 'CakmaUstad RSI Strategy by Hassonya', short: 'CakmaUstad-RSI', pane: 1, compute: computeCrsi,
    inputs: [
      { k: 'src', l: 'Source', t: 'select', d: 'close', g: 'Girdiler', opts: ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4', 'hlcc4'] },
      I('len1', 'RSI Length', 22, 'Girdiler', 1), I('len2', 'RSI-EMA Length', 66, 'Girdiler', 1),
      I('prd', 'Pivot Point Period', 10, 'Girdiler', 5, 50), I('PPnum', 'Number of Pivot Point to check', 10, 'Girdiler', 2, 10),
      { k: 'linestylei', l: 'Line Style', t: 'select', d: 'Solid', g: 'Girdiler', opts: ['Solid', 'Dashed'] },
      I('linewidth', 'Line Width', 1, 'Girdiler', 1, 4),
      { k: 'line1_color', l: 'TopLine-Color', t: 'select', d: 'red', g: 'Girdiler', opts: Object.keys(PINE_COLORS) },
      { k: 'line2_color', l: 'BottomLine-Color', t: 'select', d: 'blue', g: 'Girdiler', opts: Object.keys(PINE_COLORS) },
      B('showbroken', 'Show Broken Trend Lines', true, 'Girdiler'), B('extendlines', 'Extend Lines', false, 'Girdiler'), B('showpivot', 'Show Pivot Points', false, 'Girdiler'),
      I('ATRlength', 'ATR Length', 14, 'Girdiler', 1), B('showAtr', 'ATR tablosu', true, 'Girdiler'),
      C('rsiColor', 'RSI-22 rengi', '#8E1599'), W('rsiWidth', 'RSI-22 kalınlık', 1), C('emaColor', 'RSI-66 rengi', '#ff2cff'), W('emaWidth', 'RSI-66 kalınlık', 1),
      C('fillUp', 'RSI > EMA dolgu', `${PC.green}26`), C('fillDn', 'RSI < EMA dolgu', `${PC.red}26`), C('bgColor', 'Background (70-30)', '#C0C0C040'),
      C('hl70', 'Upper Band (70)', '#000000'), C('hl30', 'Lower Band (30)', '#000000'), C('hl50', 'Upper Line (50)', PC.gray),
      C('hl58', 'Lower Line (58)', PC.black), C('hl42', 'LLower Line (42)', PC.gray),
      C('phColor', 'Pivot High çizgisi', PC.green), C('plColor', 'Pivot Low çizgisi', PC.red),
    ],
  },
  {
    id: 'rdg', name: 'RSI-Divergence Goggles [Trendoscope®]', short: 'RDG', compute: computeRdg,
    inputs: [
      I('length', 'RSI Length', 14, 'RSI', 1),
      B('showRsi', 'RSI çizgisini fiyat grafiğinde göster', false, 'RSI'),
      { k: 'maType', l: 'Moving Average', t: 'select', d: 'sma', g: 'Trend', opts: ['sma', 'ema', 'rma', 'hma', 'wma', 'vwma'] },
      I('maLength', 'MA Length', 200, 'Trend', 5, undefined, 50),
      I('zigzagLength', 'Zigzag Length', 13, 'Zigzag', 2),
      B('showLabel', 'Show Pivot Labels', false, 'Zigzag'), B('showZigzag', 'Display Zigzag', false, 'Zigzag'),
      C('zigzagColor', 'Zigzag rengi', PC.yellow, 'Zigzag'), C('textColor', 'Etiket yazı rengi', PC.black, 'Zigzag'),
      C('rsiColor', 'RSI rengi', PC.blue), W('rsiWidth', 'RSI kalınlık', 1),
      C('bearColor', 'Bearish uyumsuzluk', PC.red), C('bullColor', 'Bullish uyumsuzluk', PC.green),
    ],
  },
  {
    id: 'pivbar', name: 'Pivot Kırılım Bar Rengi', short: 'PivotBar', compute: computePivotBars,
    inputs: [I('LleftBars', 'LleftBars', 10, 'Pivot', 1), I('RrightBars', 'RrightBars', 10, 'Pivot', 1),
      C('longColor', 'Long bar rengi', PC.green), C('shortColor', 'Short bar rengi', PC.red)],
  },
  {
    id: 'ema2', name: 'EMA 1 / EMA 2', short: 'EMA', compute: computeEma2,
    inputs: [I('length1', 'EMA 1 Uzunluğu', 100, 'EMA', 1), I('length2', 'EMA 2 Uzunluğu', 200, 'EMA', 1),
      B('show1', 'EMA 1 göster', true, 'Stil'), C('color1', 'EMA 1 rengi', PC.yellow), W('width1', 'EMA 1 kalınlık', 2),
      B('show2', 'EMA 2 göster', true, 'Stil'), C('color2', 'EMA 2 rengi', PC.blue), W('width2', 'EMA 2 kalınlık', 2)],
  },
  {
    id: 'trend', name: 'Trendlines (Lonesomeblue, Çift)', short: 'TL', compute: computeTrendlines,
    inputs: [
      I('startyear', 'Start Year', 2020, 'Trendline'), I('startmonth', 'Start Month', 1, 'Trendline', 1, 12), I('startday', 'Start Day', 1, 'Trendline', 1, 31),
      B('show1', 'Trendline 1 göster', true, 'Trendline 1'), I('prdl1', 'Pivot Period 1', 30, 'Trendline 1', 10, 50), I('PPnum1', 'Number of Pivot Points to Check 1', 5, 'Trendline 1', 2, 8),
      B('show2', 'Trendline 2 göster', true, 'Trendline 2'), I('prdl2', 'Pivot Period 2', 10, 'Trendline 2', 10, 50), I('PPnum2', 'Number of Pivot Points to Check 2', 5, 'Trendline 2', 2, 8),
      C('utcol', 'Uptrend Color 1', PC.lime), C('dtcol', 'Downtrend Color 1', PC.red), C('utcol2', 'Uptrend Color 2', PC.blue), C('dtcol2', 'Downtrend Color 2', PC.orange),
      W('width', 'Çizgi kalınlığı', 1),
    ],
  },
  {
    id: 'emax', name: 'EMA Kesişim (Fast/Slow) + Giriş Okları', short: 'EMAX', compute: computeEmaCross,
    inputs: [I('emaFastLen', 'Fast EMA Length', 38, 'EMA', 1), I('emaSlowLen', 'Slow EMA Length', 62, 'EMA', 1),
      B('pa', 'Show Conservative Entry Arrows?', true, 'Oklar'), C('upArrowColor', 'Up Entry Arrow', PC.lime, 'Oklar'), C('downArrowColor', 'Down Entry Arrow', PC.red, 'Oklar'),
      C('upColor', 'Yükseliş rengi', PC.green), C('downColor', 'Düşüş rengi', PC.red), C('eqColor', 'Eşit rengi', PC.yellow), W('width', 'Kalınlık', 2),
      C('fillColor', 'Dolgu rengi', `${PC.silver}80`)],
  },
  {
    id: 'sfp', name: 'Swing Failure Pattern (SFP)', short: 'SFP', compute: computeSfp,
    inputs: [I('len', 'Swings', 5, 'SFP', 1), I('rightBars', 'Right Bars', 1, 'SFP', 1), B('bull', 'Bullish SFP', true, 'SFP'), B('bear', 'Bearish SFP', true, 'SFP'),
      B('dSwingLine', 'Swing Lines', true, 'Stil'), B('dOpposLine', 'Confirmation Lines', true, 'Stil'), B('dSFP_Line', 'Swing Failure Wick', true, 'Stil'), B('dSFP_Label', 'Swing Failure Label', true, 'Stil'),
      C('colBl', 'Lines / Labels (Bullish)', '#089981'), C('colBr', 'Lines / Labels (Bearish)', '#f23645'),
      C('colBl2', 'SFP Wicks (Bullish)', '#08998180'), C('colBr2', 'SFP Wicks (Bearish)', '#f2364580')],
  },
  {
    id: 'mtfsfp', name: 'MTF SFP Tablosu (30M–1D)', short: 'MTF SFP', table: true,
    inputs: [I('freshBars', 'SFP Fresh Bars', 5, 'Tablo', 1), C('bullColor', 'BULL rengi', PC.lime), C('bearColor', 'BEAR rengi', PC.red), C('noneColor', 'NONE rengi', PC.gray)],
    note: 'Swings ve Right Bars değerlerini SFP göstergesinden alır.',
  },
  {
    id: 'mtfpiv', name: 'MTF Pivot Kırılım Tablosu (1M–60M)', short: 'MTF Pivot', table: true,
    inputs: [C('bullColor', 'Long rengi', PC.lime), C('bearColor', 'Short rengi', PC.red), C('noneColor', 'Nötr rengi', PC.gray)],
    note: 'LleftBars / RrightBars değerlerini Pivot Kırılım Bar Rengi göstergesinden alır.',
  },
];

INDICATORS.forEach((d) => { if (d.id !== 'rdgpack' && d.id !== 'crsi') d.pack = 'rdgpack'; });

export const isOn = (state, d) => !!state?.[d.id]?.enabled && (!d.pack || !!state?.[d.pack]?.enabled);
export const subsOf = (id) => INDICATORS.filter((d) => d.pack === id);

export const defaultsOf = (def) => Object.fromEntries(def.inputs.map((i) => [i.k, i.d]));

export const defaultIndicatorState = () => Object.fromEntries(INDICATORS.map((d) => [d.id, { enabled: true, values: defaultsOf(d) }]));

export const valuesOf = (state, id) => {
  const def = INDICATORS.find((d) => d.id === id);
  return { ...defaultsOf(def), ...(state?.[id]?.values || {}) };
};
