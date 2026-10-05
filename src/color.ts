// Color math for Color Shift: conversions (hex, OKLCH, HSB, RGB), WCAG and
// APCA contrast, and the helpers that pick and adjust color pairs.
// Ported from the web prototype (color-shift/prototype/index.html).

export type Rgb = [number, number, number];
export type SliderMode = 'OKLCH' | 'HSB' | 'RGB';
export type Algorithm = 'WCAG' | 'APCA';

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};
export const rgbToHex = (rgb: number[]) =>
  rgb.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();

const toLin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const fromLin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** OKLCH as [L 0–100, C 0–0.4, H 0–360]. */
export function rgbToOklch([r, g, b]: Rgb): Rgb {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  let h = (Math.atan2(Bb, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L * 100, Math.hypot(A, Bb), h];
}

function oklchToLinear([L, C, H]: Rgb): Rgb {
  const l0 = L / 100, a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (l0 + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (l0 - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (l0 - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (lin: Rgb) => lin.every(c => c >= -1e-4 && c <= 1 + 1e-4);
export const oklchToRgb = (lch: Rgb): Rgb => oklchToLinear(lch).map(c => fromLin(clamp(c, 0, 1))) as Rgb;

/** Highest chroma that stays on screen for this lightness and hue (binary search, like Matt's engine). */
export function maxChroma(L: number, H: number) {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear([L, mid, H]))) lo = mid; else hi = mid;
  }
  return lo;
}

export function rgbToHsb([r, g, b]: Rgb): Rgb {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [(h * 60 + 360) % 360, max ? (d / max) * 100 : 0, max * 100];
}
export function hsbToRgb([h, s, v]: Rgb): Rgb {
  const S = s / 100, V = v / 100, c = V * S, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = V - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/* ── Contrast ─────────────────────────────────────────── */

export const relLum = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function wcag(bg: string, fg: string) {
  const a = relLum(bg), b = relLum(fg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
/** APCA-W3 0.0.98G lightness contrast, as an absolute Lc value. */
export function apca(bg: string, fg: string) {
  const Y = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).map(c => (c / 255) ** 2.4);
    return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  };
  const soft = (y: number) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y);
  const t = soft(Y(fg)), k = soft(Y(bg));
  if (Math.abs(k - t) < 0.0005) return 0;
  let out: number;
  if (k > t) { const s = (k ** 0.56 - t ** 0.57) * 1.14; out = s < 0.1 ? 0 : s - 0.027; }
  else { const s = (k ** 0.65 - t ** 0.62) * 1.14; out = s > -0.1 ? 0 : s + 0.027; }
  return Math.abs(out * 100);
}

export const WCAG_LEVELS = [
  { value: 7, title: '7:1  AAA', subtitle: 'Body text, enhanced' },
  { value: 4.5, title: '4.5:1  AA', subtitle: 'Body text' },
  { value: 3, title: '3:1  AA Large', subtitle: 'Large text' },
];
export const APCA_LEVELS = [
  { value: 90, title: 'Lc 90', subtitle: 'High contrast' },
  { value: 75, title: 'Lc 75', subtitle: 'Body text' },
  { value: 60, title: 'Lc 60', subtitle: 'Content text' },
  { value: 45, title: 'Lc 45', subtitle: 'Headlines' },
  { value: 30, title: 'Lc 30', subtitle: 'Icons' },
  { value: 15, title: 'Lc 15', subtitle: 'Decorative' },
];
const wcagGrade = (r: number) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'Fail');

export function score(bg: string, fg: string, algo: Algorithm) {
  if (algo === 'WCAG') {
    const r = wcag(bg, fg);
    return { value: r, label: `${wcagGrade(r)} ${(Math.floor(r * 100) / 100).toFixed(2)}:1` };
  }
  const lc = apca(bg, fg);
  const level = APCA_LEVELS.find(l => lc >= l.value);
  return { value: lc, label: `Lc ${Math.round(lc)} ${level ? level.subtitle : 'Fail'}` };
}

/** Move the text color's OKLCH lightness until the pair just reaches `target` (like Matt's bumpToThreshold). */
export function bumpTo(bg: string, fg: string, target: number, algo: Algorithm) {
  const [, C, H] = rgbToOklch(hexToRgb(fg));
  const metric = (hex: string) => (algo === 'WCAG' ? wcag(bg, hex) : apca(bg, hex));
  const lighter = relLum(fg) >= relLum(bg);
  let lo = 0, hi = 100, best = fg, bestD = Infinity;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const hex = rgbToHex(oklchToRgb([mid, Math.min(C, maxChroma(mid, H)), H]));
    const s = metric(hex);
    if (Math.abs(s - target) < bestD && s >= target - 0.01) { bestD = Math.abs(s - target); best = hex; }
    if (lighter ? s < target : s >= target) lo = mid; else hi = mid;
  }
  return best;
}

/** A pair from a photo's Unsplash color: bg = that color, fg = same hue pushed to WCAG 4.5:1. */
export function pairFromColor(hex: string): [string, string] {
  const bg = hex.replace('#', '').toUpperCase();
  const [L, C, H] = rgbToOklch(hexToRgb(bg));
  const chromaAt = (l: number) => Math.min(Math.max(C, 0.06) * 1.4, maxChroma(l, H));
  const at = (l: number) => rgbToHex(oklchToRgb([l, chromaAt(l), H]));
  const ok = (l: number) => wcag(bg, at(l)) >= 4.5;
  if (L > 62 && ok(0)) {
    let lo = 0, hi = L;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    return [bg, at(lo)];
  }
  if (ok(100)) {
    let lo = L, hi = 100;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    return [bg, at(hi)];
  }
  return [bg, wcag(bg, '000000') > wcag(bg, 'FFFFFF') ? '000000' : 'FFFFFF'];
}

/* ── Slider channels for the Edit sheet ───────────────── */

export type Channel = {
  label: string;
  /** 0–1 position of the knob. */
  position: number;
  display: string;
  /** Gradient stops for the track, as #RRGGBB. */
  stops: string[];
  /** New hex for a knob position 0–1. */
  apply: (t: number) => string;
};

export function channels(hex: string, mode: SliderMode): Channel[] {
  const rgb = hexToRgb(hex);
  const sample = (n: number, fn: (t: number) => string) => Array.from({ length: n }, (_, i) => '#' + fn(i / (n - 1)));

  if (mode === 'OKLCH') {
    const [L, C, H] = rgbToOklch(rgb);
    const mc = Math.max(maxChroma(L, H), 0.001);
    const lAt = (t: number) => rgbToHex(oklchToRgb([t * 100, Math.min(C, maxChroma(t * 100, H)), H]));
    const cAt = (t: number) => rgbToHex(oklchToRgb([L, t * mc, H]));
    const hAt = (t: number) => rgbToHex(oklchToRgb([L, Math.min(C, maxChroma(L, t * 360)), t * 360]));
    return [
      { label: 'L', position: L / 100, display: L.toFixed(1), stops: sample(9, lAt), apply: lAt },
      { label: 'C', position: clamp(C / mc, 0, 1), display: C.toFixed(3).replace(/^0/, ''), stops: sample(6, cAt), apply: cAt },
      { label: 'H', position: H / 360, display: String(Math.round(H)), stops: sample(13, hAt), apply: hAt },
    ];
  }
  if (mode === 'HSB') {
    const [h, s, b] = rgbToHsb(rgb);
    const hAt = (t: number) => rgbToHex(hsbToRgb([t * 359.9, s, b]));
    const sAt = (t: number) => rgbToHex(hsbToRgb([h, t * 100, b]));
    const bAt = (t: number) => rgbToHex(hsbToRgb([h, s, t * 100]));
    return [
      { label: 'H', position: h / 360, display: String(Math.round(h)), stops: sample(13, hAt), apply: hAt },
      { label: 'S', position: s / 100, display: String(Math.round(s)), stops: sample(6, sAt), apply: sAt },
      { label: 'B', position: b / 100, display: String(Math.round(b)), stops: sample(6, bAt), apply: bAt },
    ];
  }
  return (['R', 'G', 'B'] as const).map((label, i) => {
    const at = (t: number) => { const c = [...rgb]; c[i] = t * 255; return rgbToHex(c); };
    return { label, position: rgb[i] / 255, display: String(rgb[i]), stops: ['#' + at(0), '#' + at(1)], apply: at };
  });
}
