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

// Estimate a horse's expected Beyer at a given distance based on current
// stats, form, and energy — mirrors raceSim's buildRunner pace logic so the
// preview blurb stays consistent with the live simulation.
import type { Horse } from "./types";
export function expectedBeyer(h: Horse, distance: number, classBonus = 0): number {
  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  const topSpeed = (12 + (h.stats.speed / 100) * 10) * formMod * energyMod;
  // Stamina fade across last 40% of race (matches stepRunner curve).
  const staminaFactor = 0.4 + (h.stats.stamina / 100) * 0.6;
  // Average pace = 60% at top + 40% scaled by avg fade (1 + staminaFactor)/2.
  const avgPace = topSpeed * (0.6 + 0.4 * ((1 + staminaFactor) / 2));
  const finishTime = distance / Math.max(1, avgPace);
  return beyerFigure({ distance, finishTime, classBonus });
}

