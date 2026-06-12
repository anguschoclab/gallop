/**
 * phases/beyerRecalibration.ts - Beyer par recalibration phase
 *
 * This file provides the Beyer par recalibration phase that recalibrates
 * Beyer speed figure pars every 30 days (SEASON_DAYS).
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/store/helpers/beyer (maybeRecalibratePars), @/game/constants (SEASON_DAYS)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { maybeRecalibratePars } from "@/game/store/helpers/beyer";
import { SEASON_DAYS, PHASE_ORDER_BEYER_RECALIBRATION } from "@/constants";

/**
 * Phase: Beyer Par Recalibration
 * Recalibrate Beyer speed figure pars every 30 days (SEASON_DAYS)
 */
export const beyerRecalibrationPhase = {
  name: "beyerRecalibration",
  order: PHASE_ORDER_BEYER_RECALIBRATION,
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
