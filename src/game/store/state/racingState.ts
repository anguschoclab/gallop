/**
 * state/racingState.ts - Racing state management
 *
 * This file provides racing analytics state for performance tracking, including
 * pace samples, calibrated par times, last calibration day, and training usage
 * per horse.
 *
 * Dependencies: None (self-contained types)
 * Related files: store.ts (uses racing state), training.ts (uses training tracking)
 */

// Racing State - Performance analytics and training tracking
// Includes pace samples, par times, and daily training limits

/**
 * Racing analytics state for performance tracking.
 * Most properties are computed/updated periodically.
 */
export interface RacingState {
  /** Pace samples per 200m distance bucket (winner finish times in seconds) */
  paceSamples?: Record<number, number[]>;
  /** Calibrated par times per bucket, recomputed each season */
  calibratedPars?: Record<number, number>;
  /** Day when par times were last calibrated */
  lastCalibrationDay?: number;
  /** Training slots used per horse today (horseId -> count) */
  trainingUsed: Record<string, number>;
}

/**
 * Create default racing state for new games.
 *
 * @returns Default racing state with empty training usage
 */
export function createDefaultRacingState(): RacingState {
  return {
    trainingUsed: {},
  };
}
