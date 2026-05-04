import type { PipelineContext } from "../pipeline";
import { generateUpcomingRaces, pruneOldRaces } from "@/game/store";

/**
 * Phase: Race Generation and Pruning
 * Generate upcoming races (7 days ahead) and prune old races (older than 3 days)
 */
export const racesPhase = {
  name: "races",
  order: 60,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const races = generateUpcomingRaces(state.races, newDay);
    const pruned = pruneOldRaces(races, newDay);

    return {
      ...context,
      state: {
        ...state,
        races: pruned,
      },
    };
  },
};
