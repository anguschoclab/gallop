import type { PipelineContext } from "../pipeline";
import type { Horse, Pregnancy } from "@/game/types";
import { resolveFoaling } from "@/game/foalGen";
import { getFoalsBy } from "@/core/breeding/lineage";
import { resolvePregnancies } from "@/game/store";

/**
 * Phase: Pregnancy Resolution
 * Resolve pregnancies and handle foaling events
 */
export const pregnancyPhase = {
  name: "pregnancy",
  order: 70,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const pregResult = resolvePregnancies(state.pregnancies, state.horses, newDay);
    const { pregnancies, foals, cashAdjustment } = pregResult;

    return {
      ...context,
      state: {
        ...state,
        horses: [...state.horses, ...foals],
        pregnancies,
        cash: state.cash + cashAdjustment,
      },
      logs: [...context.logs, ...pregResult.logs],
    };
  },
};
