import type { Horse } from "@/game/types";
import { parTime } from "@/game/beyer";
import { BEYER_BASE, BEYER_FORMULA_SCALE } from "@/game/constants";

/**
 * Format a time in seconds as a human-readable split string.
 * e.g. 62.3 → "1:02.3",  12.5 → "12.5s"
 */
export function formatSplitTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, "0")}` : `${s.toFixed(1)}s`;
}

/**
 * Estimate the expected split time for a horse at a given race-distance
 * fraction, based on its historical Beyer figures at similar distances.
 */
export function getTargetSplitTime(
  horse: Horse,
  distance: number,
  markerFraction: number,
  calibratedPars: Record<number, number>,
): number | null {
  const qualifying = (horse.raceHistory ?? []).filter(
    (h) => h.beyer != null && h.distance != null && Math.abs(h.distance - distance) <= 200,
  );
  if (qualifying.length < 2) return null;
  const avgBeyer = qualifying.reduce((sum, h) => sum + h.beyer!, 0) / qualifying.length;
  const par = parTime(distance, calibratedPars);
  // Inverse of beyerFigure: finishTime = par * (1 - (beyer - BEYER_BASE) / BEYER_FORMULA_SCALE)
  const expectedFinish = par * (1 - (avgBeyer - BEYER_BASE) / BEYER_FORMULA_SCALE);
  return expectedFinish * markerFraction;
}
