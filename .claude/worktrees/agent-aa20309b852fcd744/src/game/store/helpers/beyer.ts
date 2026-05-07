/**
 * Beyer Figure Helper Functions
 * Pure business logic for Beyer par recalibration
 */

import { SEASON_DAYS } from "@/game/constants/gameConstants";
import { setCalibratedPars } from "@/game/beyer";

export type RecalibrationResult = {
  calibratedPars: Record<number, number> | undefined;
  lastCalibrationDay: number;
  log: { day: number; text: string } | null;
};

/**
 * Recalibrates Beyer pars if enough time has passed since last recalibration
 * Recalibration occurs every SEASON_DAYS (30 days)
 * @param currentPars - Current calibrated pars
 * @param lastCalibrationDay - Day of last recalibration
 * @param paceSamples - Pace samples for recalibration
 * @param newDay - Current simulation day
 * @returns Recalibration result with updated pars and log entry
 */
export function maybeRecalibratePars(
  currentPars: Record<number, number> | undefined,
  lastCalibrationDay: number,
  paceSamples: Record<number, number[]> | undefined,
  newDay: number,
): RecalibrationResult {
  if (newDay - lastCalibrationDay < SEASON_DAYS) {
    return { calibratedPars: currentPars, lastCalibrationDay, log: null };
  }
  const recomputed = recomputePars(paceSamples ?? {});
  if (Object.keys(recomputed).length === 0) {
    return { calibratedPars: currentPars, lastCalibrationDay, log: null };
  }
  setCalibratedPars(recomputed);
  const buckets = Object.keys(recomputed).length;
  return {
    calibratedPars: recomputed,
    lastCalibrationDay: newDay,
    log: {
      day: newDay,
      text: `Beyer par recalibrated from ${buckets} distance bucket${buckets === 1 ? "" : "s"}.`,
    },
  };
}

/**
 * Recomputes Beyer pars from pace samples
 * Uses 40th percentile (slightly faster than median) to match "above-average winner" intent
 * @param samples - Pace samples by distance bucket
 * @returns Recomputed pars by distance bucket
 */
export function recomputePars(samples: Record<number, number[]>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, arr] of Object.entries(samples)) {
    if (arr.length < 3) continue;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.4);
    out[Number(k)] = sorted[idx];
  }
  return out;
}
