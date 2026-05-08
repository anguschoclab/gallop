// Impact Application Phase
// Applies all impacts to the state using the resolver

import type { PipelineContext, PipelinePhase } from "../pipeline";
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
  order: 200,
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
    if (cleanedState.seasonRecords && cleanedState.seasonRecords.length > 500) {
      cleanedState.seasonRecords = cleanedState.seasonRecords.slice(-500);
    }
    if (cleanedState.scoutReports && cleanedState.scoutReports.length > 100) {
      cleanedState.scoutReports = cleanedState.scoutReports.slice(-100);
    }
    if (cleanedState.triplecrownHistory && cleanedState.triplecrownHistory.length > 100) {
      cleanedState.triplecrownHistory = cleanedState.triplecrownHistory.slice(-100);
    }
    if (cleanedState.paceSamples) {
      // Pace samples is an object with arrays, clean each bucket
      for (const key in cleanedState.paceSamples) {
        if (cleanedState.paceSamples[key].length > 100) {
          cleanedState.paceSamples[key] = cleanedState.paceSamples[key].slice(-100);
        }
      }
    }
    if (cleanedState.hallOfFame && cleanedState.hallOfFame.length > 200) {
      cleanedState.hallOfFame = cleanedState.hallOfFame.slice(-200) as any;
    }

    return {
      ...context,
      state: cleanedState,
      impactLog: updatedContext.impactLog,
    };
  },
};
