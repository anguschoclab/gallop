/**
 * hooks/useRacingState.ts - Racing state selectors
 *
 * This file provides Zustand hooks for racing state including pace samples,
 * calibrated pars, calibration day, and training usage with shallow comparison.
 *
 * Dependencies: @/game/store (useGame, useGameWithShallow), @/game/types (GameState)
 * Related files: store.ts (state management), raceSim.ts (uses racing state)
 */

import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Racing state selectors for performance analytics and training tracking.
 *
 * @returns Array of pace samples
 */
export const usePaceSamples = () => useGame((s: GameState) => s.paceSamples);

/**
 * @returns Object containing calibrated pars
 */
export const useCalibratedPars = () => useGame((s: GameState) => s.calibratedPars);

/**
 * @returns Last day of calibration
 */
export const useLastCalibrationDay = () => useGame((s: GameState) => s.lastCalibrationDay);

/**
 * @returns Array of training usage records
 */
export const useTrainingUsed = () => useGame((s: GameState) => s.trainingUsed);

/**
 * Multiple racing state values with shallow comparison.
 * Use this when you need multiple racing state values in a single hook call.
 *
 * @returns Object containing pace samples, calibrated pars, last calibration day, and training used
 */
export const useRacingState = () => {
  const paceSamples = useGame((s: GameState) => s.paceSamples);
  const calibratedPars = useGame((s: GameState) => s.calibratedPars);
  const lastCalibrationDay = useGame((s: GameState) => s.lastCalibrationDay);
  const trainingUsed = useGame((s: GameState) => s.trainingUsed);

  return {
    paceSamples,
    calibratedPars,
    lastCalibrationDay,
    trainingUsed,
  };
};
