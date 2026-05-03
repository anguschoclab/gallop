// Lightweight Beyer-style speed figure.
// Real Beyer figures use track-specific daily variants from par times.
// We approximate: figure scales linearly with how far finish time beats a
// par time for the distance, with grade/race-class adding a small uplift.
// Output is clamped 30..125 (Beyer "Big Figs" rarely exceed 120).

export type BeyerInput = {
  distance: number; // meters
  finishTime: number; // seconds
  classBonus?: number; // 0..10 — grade/stakes uplift
};

// Par time (s) for an "average" winner at a given distance.
// Calibrated to the runner sim (~16-18 m/s sustained).
function parTime(distance: number): number {
  return distance / 16.7; // ~60s per 1000m
}

export function beyerFigure({ distance, finishTime, classBonus = 0 }: BeyerInput): number {
  if (!isFinite(finishTime) || finishTime <= 0) return 0;
  const par = parTime(distance);
  // Each ~1% faster than par = ~5 Beyer points.
  const delta = (par - finishTime) / par;
  const fig = 80 + delta * 500 + classBonus;
  return Math.max(30, Math.min(125, Math.round(fig)));
}
