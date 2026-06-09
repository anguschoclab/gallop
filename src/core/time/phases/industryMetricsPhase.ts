/**
 * phases/industryMetricsPhase.ts - Industry metrics phase
 *
 * This file provides the industry metrics phase that recomputes industry mean earnings
 * every season (30 days) for AEI (Average Earnings Index) calculation.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/breeding/industryMetrics (computeIndustryMeanEarnings), @/game/types (Horse), @/lib/formatting (formatCurrency)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_INDUSTRY_METRICS } from "@/constants/game";
import type { PipelineContext } from "../pipeline";
import { computeIndustryMeanEarnings } from "@/core/breeding/industryMetrics";
import type { Horse } from "@/game/types";
import { formatCurrency } from "@/lib/formatting";

/**
 * Phase: Industry Metrics
 * Recompute industry mean earnings every season (30 days)
 * Used for AEI (Average Earnings Index) calculation
 */
export const industryMetricsPhase = {
  name: "industryMetrics",
  order: PHASE_ORDER_INDUSTRY_METRICS, // After breedingSeason (35), before npcBreeding (38)
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
        { day: newDay, text: `Industry mean earnings updated: ${formatCurrency(industryMean)}` },
      ],
    };
  },
};
