import type { PipelineContext } from "../pipeline";
import { generateUpcomingRaces, pruneOldRaces } from "@/game/store";
import { createRng, hashStr } from "@/game/rng";

/**
 * Phase: Race Generation and Pruning
 * Generate upcoming races (7 days ahead) and prune old non-graded races (older than 3 days)
 * Graded stakes races are preserved indefinitely to support calendar views
 */
export const racesPhase = {
  name: "races",
  order: 60,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const rng = createRng(hashStr(`races_${newDay}`));
    const races = generateUpcomingRaces(state.races, newDay, rng);
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
