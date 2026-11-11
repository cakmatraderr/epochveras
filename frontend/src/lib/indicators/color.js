export const toRgba = (c) => {
  if (!c || c[0] !== '#') return c;
  const h = c.slice(1);
  const r = parseInt(h.slice(0, 2), 16); const g = parseInt(h.slice(2, 4), 16); const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${+a.toFixed(3)})`;
};

export const splitColor = (c) => ({ hex: (c || '#000000').slice(0, 7), alpha: c && c.length >= 9 ? parseInt(c.slice(7, 9), 16) / 255 : 1 });

export const joinColor = (hex, alpha) => `${hex}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')}`;

// Pine palette
export const PC = {
  green: '#4CAF50', red: '#FF5252', lime: '#00E676', orange: '#FF9800', yellow: '#FFEB3B', blue: '#2196F3',
  purple: '#9C27B0', silver: '#B2B5BE', gray: '#787B86', black: '#363A45', white: '#FFFFFF', fg: '#D1D4DC',
};
