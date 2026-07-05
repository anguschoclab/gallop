/**
 * phases/impactApplication.ts - Impact application phase
 *
 * This file provides the impact application phase that applies all impacts to the
 * state using the resolver with Immer for immutable state updates.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/resolver (applyImpacts, ResolverContext)
 * Related files: ../pipeline.ts (uses phase)
 */

// Impact Application Phase
// Applies all impacts to the state using the resolver

import type { PipelineContext, PipelinePhase } from "../pipeline";
import {
  HALL_OF_FAME_MAX_SIZE,
  SEASON_RECORDS_MAX_SIZE,
  SCOUT_REPORTS_MAX_SIZE,
  TRIPLE_CROWN_HISTORY_MAX_SIZE,
  PACE_SAMPLES_MAX_SIZE,
  PHASE_ORDER_IMPACT_APPLICATION,
} from "@/constants";
import { applyImpacts, type ResolverContext } from "@/core/resolver/resolver";

/**
 * Impact Application Phase (Order 200)
 * Applies all impacts to the state:
 * - Uses Immer for immutable state updates
 * - Logs impacts based on logLevel
 * - Returns final state with all impacts applied
 */
export const impactApplicationPhase: PipelinePhase = {
  name: "impactApplication",
  order: PHASE_ORDER_IMPACT_APPLICATION,
  execute: (context: PipelineContext): PipelineContext => {
    const resolverContext: ResolverContext = {
      state: context.state,
      intents: context.intents,
      impacts: context.impacts,
      impactLog: context.impactLog,
      day: context.newDay,
    };

    const updatedContext = applyImpacts(resolverContext);

    // Cleanup: Cap other arrays to prevent memory bloat
    const cleanedState = { ...updatedContext.state };
    if (cleanedState.seasonRecords && cleanedState.seasonRecords.length > SEASON_RECORDS_MAX_SIZE) {
      cleanedState.seasonRecords = cleanedState.seasonRecords.slice(-SEASON_RECORDS_MAX_SIZE);
    }
    if (cleanedState.scoutReports && cleanedState.scoutReports.length > SCOUT_REPORTS_MAX_SIZE) {
      cleanedState.scoutReports = cleanedState.scoutReports.slice(-SCOUT_REPORTS_MAX_SIZE);
    }
    if (
      cleanedState.triplecrownHistory &&
      cleanedState.triplecrownHistory.length > TRIPLE_CROWN_HISTORY_MAX_SIZE
    ) {
      cleanedState.triplecrownHistory = cleanedState.triplecrownHistory.slice(
        -TRIPLE_CROWN_HISTORY_MAX_SIZE,
      );
    }
    if (cleanedState.paceSamples) {
      // Pace samples is an object with arrays, clean each bucket
      const newPaceSamples: any = {};
      for (const key in cleanedState.paceSamples) {
        newPaceSamples[key] =
          cleanedState.paceSamples[key].length > PACE_SAMPLES_MAX_SIZE
            ? cleanedState.paceSamples[key].slice(-PACE_SAMPLES_MAX_SIZE)
            : cleanedState.paceSamples[key];
      }
      cleanedState.paceSamples = newPaceSamples;
    }
    if (cleanedState.hallOfFame && cleanedState.hallOfFame.length > HALL_OF_FAME_MAX_SIZE) {
      cleanedState.hallOfFame = cleanedState.hallOfFame.slice(-HALL_OF_FAME_MAX_SIZE);
    }

    return {
      ...context,
      state: cleanedState,
      impactLog: updatedContext.impactLog,
    };
  },
};
