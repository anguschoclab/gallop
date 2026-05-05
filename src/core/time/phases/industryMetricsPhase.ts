import type { PipelineContext } from "../pipeline";
import { computeIndustryMeanEarnings } from "@/core/breeding/industryMetrics";
import type { Horse } from "@/game/types";

/**
 * Phase: Industry Metrics
 * Recompute industry mean earnings every season (30 days)
 * Used for AEI (Average Earnings Index) calculation
 */
export const industryMetricsPhase = {
  name: "industryMetrics",
  order: 45, // After breedingSeason (35), before npcBreeding (38)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Recompute industry mean earnings every season (30 days)
    const shouldRecompute =
      !state.industryEarningsUpdatedDay || newDay - state.industryEarningsUpdatedDay >= 30;

    if (!shouldRecompute) return context;

    const industryMean = computeIndustryMeanEarnings(state.horses);

    return {
      ...context,
      state: {
        ...state,
        industryMeanEarnings: industryMean,
        industryEarningsUpdatedDay: newDay,
      },
      logs: [
        ...context.logs,
        { day: newDay, text: `Industry mean earnings updated: $${industryMean.toLocaleString()}` },
      ],
    };
  },
};
