/**
 * beyer.ts - Beyer-style speed figure calculation
 *
 * This file provides lightweight Beyer-style speed figure calculation based on
 * finish time vs par time, with optional calibrated pars and class bonuses.
 *
 * Dependencies: ./types (Horse), ./tracks (CourseSpecification)
 * Related files: raceSim.ts (uses Beyer figures for race results), projections.ts (uses for race analysis)
 */

// Lightweight Beyer-style speed figure.
// Real Beyer figures use track-specific daily variants from par times.
// We approximate: figure scales linearly with how far finish time beats a
// par time for the distance, with grade/race-class adding a small uplift.
// Output is clamped 30..125 (Beyer "Big Figs" rarely exceed 120).
import type { Horse } from "@/core/horse/types";
import type { CourseSpecification } from "@/game/tracks";
import { BEYER_MIN, BEYER_MAX, BEYER_BASE } from "@/game/constants/gameConstants";

export type BeyerInput = {
  distance: number; // meters
  finishTime: number; // seconds
  classBonus?: number; // 0..10 — grade/stakes uplift
  calibratedPars?: Record<number, number>; // Optional injected pars
};

// Default par time (s) for an "average" winner at a given distance.
// Calibrated to the runner sim (~16-18 m/s sustained).
function defaultParTime(distance: number): number {
  return distance / 16.7; // ~60s per 1000m
}

/**
 * Calculate distance bucket for par time calibration.
 *
 * @param distance - Race distance in meters
 * @returns Distance bucket (rounded to nearest 200m)
 */
export function distanceBucket(distance: number): number {
  return Math.max(200, Math.round(distance / 200) * 200);
}

/**
 * Calculate par time for a given distance.
 *
 * Uses calibrated pars if available, otherwise falls back to analytical default.
 * Blends with neighboring bucket data for smooth interpolation.
 *
 * @param distance - Race distance in meters
 * @param calibratedPars - Optional calibrated par times by distance bucket
 * @returns Par time in seconds
 */
export function parTime(distance: number, calibratedPars: Record<number, number> = {}): number {
  const b = distanceBucket(distance);
  // Blend: if calibration exists for this bucket, lean on it; otherwise fall
  // back to the analytical default. Also nudge toward neighboring buckets so
  // an unsampled distance still benefits from nearby data.
  const direct = calibratedPars[b];
  if (direct) return direct * (distance / b);
  const neighbors = [b - 200, b + 200].map((k) => calibratedPars[k]).filter(Boolean);
  if (neighbors.length) {
    const avg = neighbors.reduce((s, v) => s + v, 0) / neighbors.length;
    return avg * (distance / b);
  }
  return defaultParTime(distance);
}

/**
 * Calculate Beyer-style speed figure.
 *
 * Scales linearly with how far finish time beats par time, with grade/race-class uplift.
 * Output clamped to 30-125 (Beyer "Big Figs" rarely exceed 120).
 *
 * @param input - Beyer calculation parameters
 * @param input.distance - Race distance in meters
 * @param input.finishTime - Finish time in seconds
 * @param input.classBonus - Optional grade/stakes uplift
 * @param input.calibratedPars - Optional calibrated par times
 * @returns Beyer figure (30-125)
 */
export function beyerFigure({
  distance,
  finishTime,
  classBonus = 0,
  calibratedPars = {},
}: BeyerInput): number {
  if (!isFinite(finishTime) || finishTime <= 0) return 0;
  const par = parTime(distance, calibratedPars);
  // Each ~1% faster than par = ~5 Beyer points.
  const delta = (par - finishTime) / par;
  const fig = BEYER_BASE + delta * 500 + classBonus;
  return Math.max(BEYER_MIN, Math.min(BEYER_MAX, Math.round(fig)));
}

/**
 * Estimate a horse's expected Beyer at a given distance.
 *
 * Calculates expected Beyer based on current stats, form, energy, and track complexity.
 * Applies penalties for tight turns and steep gradients based on horse aptitudes.
 *
 * @param h - Horse to calculate for
 * @param distance - Race distance in meters
 * @param classBonus - Optional class bonus (0-10)
 * @param course - Optional course specification for complexity calculations
 * @param calibratedPars - Optional calibrated par times by distance bucket
 * @returns Expected Beyer figure
 */
export function expectedBeyer(
  h: Horse,
  distance: number,
  classBonus = 0,
  course?: CourseSpecification,
  calibratedPars: Record<number, number> = {},
): number {
  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  let topSpeed = (12 + (h.stats.speed / 100) * 10) * formMod * energyMod;

  // Track Complexity Factor
  if (course) {
    // Penalize speed based on turn tightess vs cornering aptitude
    const avgRadius =
      course.sections
        .filter((s) => s.type === "turn")
        .reduce((acc, s) => acc + (s.radius || 300), 0) /
      Math.max(1, course.sections.filter((s) => s.type === "turn").length);

    if (avgRadius < 200) {
      const penalty = (200 - avgRadius) / 1000;
      const mitigation = (h.corneringAptitude - 1.0) * 0.5;
      topSpeed *= 1 - Math.max(0, penalty - mitigation);
    }

    // Penalize speed based on gradients vs climbing aptitude
    const maxGradient = Math.max(...course.sections.map((s) => s.gradient || 0), 0);
    if (maxGradient > 1) {
      const penalty = maxGradient / 100;
      const mitigation = (h.climbingAptitude - 1.0) * 0.5;
      topSpeed *= 1 - Math.max(0, penalty - mitigation);
    }
  }

  // Stamina fade across last 40% of race (matches stepRunner curve).
  const staminaFactor = 0.4 + (h.stats.stamina / 100) * 0.6;
  // Average pace = 60% at top + 40% scaled by avg fade (1 + staminaFactor)/2.
  const avgPace = topSpeed * (0.6 + 0.4 * ((1 + staminaFactor) / 2));
  const finishTime = distance / Math.max(1, avgPace);
  return beyerFigure({ distance, finishTime, classBonus, calibratedPars });
}

/**
 * Calculate Beyer for a race result.
 *
 * Convenience wrapper for beyerFigure using individual parameters.
 *
 * @param distance - Race distance in meters
 * @param finishTime - Finish time in seconds
 * @param classBonus - Optional class bonus (0-10)
 * @param calibratedPars - Optional calibrated par times by distance bucket
 * @returns Beyer figure (30-125)
 */
export function calculateBeyerForResult(
  distance: number,
  finishTime: number,
  classBonus = 0,
  calibratedPars: Record<number, number> = {},
): number {
  return beyerFigure({ distance, finishTime, classBonus, calibratedPars });
}

/**
 * Detect a "pattern jump" or "storm" event — a significant performance improvement.
 *
 * Criteria for a jump:
 * 1. New Beyer is 15+ points above the horse's historical average.
 * 2. OR New Beyer is 10+ points above career best (requires at least 2 previous starts).
 *
 * @param horse - Horse to check
 * @param newBeyer - Beyer figure from the most recent race
 * @returns Result with jumped flag and improvement margin
 */
export function detectPatternJump(
  horse: Horse,
  newBeyer: number,
): { jumped: boolean; margin: number } {
  const beyerHistory = horse.raceHistory
    .filter((r) => r.beyer !== undefined)
    .map((r) => r.beyer!);

  if (beyerHistory.length === 0) return { jumped: false, margin: 0 };

  const avgBeyer = beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length;
  const careerBest = Math.max(...beyerHistory);

  const jumpOverAvg = newBeyer - avgBeyer;
  const jumpOverBest = newBeyer - careerBest;

  // Pattern Jump logic: 15+ over average OR 10+ over career high (if established)
  if (jumpOverAvg >= 15 || (beyerHistory.length >= 2 && jumpOverBest >= 10)) {
    return { jumped: true, margin: Math.max(jumpOverAvg, jumpOverBest) };
  }

  return { jumped: false, margin: 0 };
}
