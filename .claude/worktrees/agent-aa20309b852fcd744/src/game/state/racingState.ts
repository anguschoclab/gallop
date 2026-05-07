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
 * Default racing state for new games
 */
export function createDefaultRacingState(): RacingState {
  return {
    trainingUsed: {},
  };
}
