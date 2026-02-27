// ============================================================
// utils.js — Helpers mathématiques et projection isométrique
// ============================================================

export const lerp    = (a, b, t) => a + (b - a) * t;
export const clamp   = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
export const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;

/**
 * Coordonnées iso des 4 sommets d'une tuile
 * grid [col, row] → canvas {top, right, bottom, left}
 */
export function getTileVerts(col, row, tw, th, ox, oy) {
  const x = (col - row) * (tw / 2) + ox;
  const y = (col + row) * (th / 4) + oy;
  return {
    top:    { x,           y           },
    right:  { x: x+tw/2,  y: y+th/4   },
    bottom: { x,           y: y+th/2   },
    left:   { x: x-tw/2,  y: y+th/4   },
  };
}

/** Hex color → {r,g,b} */
export function hexRgb(h) {
  if (!h || h[0] !== '#') return null;
  const n = parseInt(h.slice(1), 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}

/** Interpolation linéaire entre deux couleurs hex */
export function lerpColor(h1, h2, t) {
  const a = hexRgb(h1), b = hexRgb(h2);
  if (!a || !b) return h1;
  return `rgb(${Math.round(a.r+(b.r-a.r)*t)},${Math.round(a.g+(b.g-a.g)*t)},${Math.round(a.b+(b.b-a.b)*t)})`;
}

/** Assombrit une couleur hex d'un facteur 0-1 */
export function darken(hex, amt) {
  const c = hexRgb(hex);
  if (!c) return hex;
  return `rgb(${Math.round(c.r*(1-amt))},${Math.round(c.g*(1-amt))},${Math.round(c.b*(1-amt))})`;
}

/** Normalise une couleur en clé de comparaison */
export function colorKey(c) {
  return (c || '').toLowerCase().replace(/\s/g, '');
}
