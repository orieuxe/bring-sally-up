export const ACCENT = '#b76d0c';
export const RECORD_GOLD = '#e89b2e';

function hexToRgb(hex: string): number[] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

const _accentRgb = hexToRgb(ACCENT);
export const ACCENT_RGB = `${_accentRgb[0]},${_accentRgb[1]},${_accentRgb[2]}`;
const PALETTE = [
  '#413333',
  '#8f3a31',
  '#6b7a67',
  '#36a54c',
  '#0e7355',
];
const STOPS = PALETTE.map((h, i) => ({
  r: 0.20 + (i / (PALETTE.length - 1)) * 1.30,
  color: hexToRgb(h),
}));

export function scoreColor(score: number, avg: number): string {
  if (score === 0) return '#1a1a1a';
  // No average yet (first ever session): median green instead of dull grey
  const ratio = avg > 0 ? Math.min(score / avg, 1.5) : 1;

  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (ratio >= STOPS[i].r && ratio <= STOPS[i + 1].r) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  if (ratio <= STOPS[0].r) {
    lo = STOPS[0];
    hi = STOPS[0];
  }
  if (ratio >= STOPS[STOPS.length - 1].r) {
    lo = STOPS[STOPS.length - 1];
    hi = STOPS[STOPS.length - 1];
  }

  const t = hi.r !== lo.r ? (ratio - lo.r) / (hi.r - lo.r) : 0;
  const r = Math.round(lo.color[0] + (hi.color[0] - lo.color[0]) * t);
  const g = Math.round(lo.color[1] + (hi.color[1] - lo.color[1]) * t);
  const b = Math.round(lo.color[2] + (hi.color[2] - lo.color[2]) * t);
  return `rgb(${r},${g},${b})`;
}
