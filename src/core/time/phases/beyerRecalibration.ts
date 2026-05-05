import type { PipelineContext } from "../pipeline";
import { maybeRecalibratePars } from "@/game/store";

/**
 * Phase: Beyer Par Recalibration
 * Recalibrate Beyer speed figure pars every 30 days (SEASON_DAYS)
 */
export const beyerRecalibrationPhase = {
  name: "beyerRecalibration",
  order: 65,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const parResult = maybeRecalibratePars(
      state.calibratedPars,
      state.lastCalibrationDay ?? 0,
      state.paceSamples,
      newDay,
    );
    const { calibratedPars, lastCalibrationDay } = parResult;
    const seasonLog: { day: number; text: string }[] = parResult.log ? [parResult.log] : [];

    return {
      ...context,
      state: {
        ...state,
        calibratedPars,
        lastCalibrationDay,
      },
      logs: [...context.logs, ...seasonLog],
    };
  },
};
