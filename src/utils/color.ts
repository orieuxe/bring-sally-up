const COLORS = ["#1a1a1a", "#3d2020", "#6b3812", "#3d5c20", "#2d8f2d"];

const STOPS = [
  { r: 0.20, color: [0x54, 0x2e, 0x2e] },  // red   @ ratio 0.2
  { r: 0.50, color: [0x7a, 0x4a, 0x1e] },  // orange @ ratio 0.5
  { r: 0.85, color: [0x4a, 0x6e, 0x2a] },  // olive  @ ratio 0.85
  { r: 1.20, color: [0x38, 0xa6, 0x36] },  // green  @ ratio 1.2
];

export function scoreColor(score: number, avg: number): string {
  if (score === 0 || avg <= 0) return COLORS[0];
  const ratio = Math.min(score / avg, 1.5);

  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (ratio >= STOPS[i].r && ratio <= STOPS[i + 1].r) {
      lo = STOPS[i]; hi = STOPS[i + 1]; break;
    }
  }
  if (ratio <= STOPS[0].r) { lo = STOPS[0]; hi = STOPS[0]; }
  if (ratio >= STOPS[STOPS.length - 1].r) { lo = STOPS[STOPS.length - 1]; hi = STOPS[STOPS.length - 1]; }

  const t = hi.r !== lo.r ? (ratio - lo.r) / (hi.r - lo.r) : 0;
  const r = Math.round(lo.color[0] + (hi.color[0] - lo.color[0]) * t);
  const g = Math.round(lo.color[1] + (hi.color[1] - lo.color[1]) * t);
  const b = Math.round(lo.color[2] + (hi.color[2] - lo.color[2]) * t);
  return `rgb(${r},${g},${b})`;
}
