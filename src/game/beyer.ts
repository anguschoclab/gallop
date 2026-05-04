// Lightweight Beyer-style speed figure.
// Real Beyer figures use track-specific daily variants from par times.
// We approximate: figure scales linearly with how far finish time beats a
// par time for the distance, with grade/race-class adding a small uplift.
// Output is clamped 30..125 (Beyer "Big Figs" rarely exceed 120).
import type { Horse } from "./types";

export type BeyerInput = {
  distance: number; // meters
  finishTime: number; // seconds
  classBonus?: number; // 0..10 — grade/stakes uplift
};

// Default par time (s) for an "average" winner at a given distance.
// Calibrated to the runner sim (~16-18 m/s sustained).
function defaultParTime(distance: number): number {
  return distance / 16.7; // ~60s per 1000m
}

// Calibrated par lookup, populated by the simulator each "season" from
// observed finish times. Keys are 200m-rounded distance buckets.
let CALIBRATED_PARS: Record<number, number> = {};

export function distanceBucket(distance: number): number {
  return Math.max(200, Math.round(distance / 200) * 200);
}

export function setCalibratedPars(pars: Record<number, number>) {
  CALIBRATED_PARS = { ...pars };
}

export function getCalibratedPars(): Record<number, number> {
  return CALIBRATED_PARS;
}

export function parTime(distance: number): number {
  const b = distanceBucket(distance);
  // Blend: if calibration exists for this bucket, lean on it; otherwise fall
  // back to the analytical default. Also nudge toward neighboring buckets so
  // an unsampled distance still benefits from nearby data.
  const direct = CALIBRATED_PARS[b];
  if (direct) return direct * (distance / b);
  const neighbors = [b - 200, b + 200].map((k) => CALIBRATED_PARS[k]).filter(Boolean);
  if (neighbors.length) {
    const avg = neighbors.reduce((s, v) => s + v, 0) / neighbors.length;
    return avg * (distance / b);
  }
  return defaultParTime(distance);
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

// Calculate Beyer for a race result
export function calculateBeyerForResult(
  distance: number,
  finishTime: number,
  classBonus = 0,
): number {
  return beyerFigure({ distance, finishTime, classBonus });
}
