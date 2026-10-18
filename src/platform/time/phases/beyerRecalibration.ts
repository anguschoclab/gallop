/**
 * phases/beyerRecalibration.ts - Beyer par recalibration phase
 *
 * This file provides the Beyer par recalibration phase that recalibrates
 * Beyer speed figure pars every 30 days (SEASON_DAYS).
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/race/beyerPars (maybeRecalibratePars), @/constants (SEASON_DAYS)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "@/platform/time/pipeline";
import { maybeRecalibratePars } from "@/domains/race/simulation/beyerPars";
import { PHASE_ORDER_BEYER_RECALIBRATION } from "@/platform/time/pipelineConstants";;

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
