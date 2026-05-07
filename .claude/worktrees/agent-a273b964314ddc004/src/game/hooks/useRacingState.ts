import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Racing state selectors for performance analytics and training tracking
 */
export const usePaceSamples = () => useGame((s: GameState) => s.paceSamples);
export const useCalibratedPars = () => useGame((s: GameState) => s.calibratedPars);
export const useLastCalibrationDay = () => useGame((s: GameState) => s.lastCalibrationDay);
export const useTrainingUsed = () => useGame((s: GameState) => s.trainingUsed);

/**
 * Multiple racing state values with shallow comparison
 * Use this when you need multiple racing state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation
 */
export const useRacingState = () =>
  (useGame as any)(
    (s: GameState) => ({
      paceSamples: s.paceSamples,
      calibratedPars: s.calibratedPars,
      lastCalibrationDay: s.lastCalibrationDay,
      trainingUsed: s.trainingUsed,
    }),
    shallow,
  );
