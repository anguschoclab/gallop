/**
 * phases/npcBreedingPhase.ts - NPC autonomous breeding phase
 *
 * This file provides the NPC autonomous breeding phase that runs at the start of
 * each hemisphere's breeding season for breeder/developer/prestige stables.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/npcBreeding (runNpcBreeding)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { runNpcBreeding } from "@/game/npcBreeding";

/**
 * Phase: NPC Autonomous Breeding
 * Runs at the start of each hemisphere's breeding season (a no-op on other
 * days). Breeder/developer/prestige stables mate their broodmares to the
 * stallion that maximizes a compatibility/fee tradeoff.
 *
 * Order 38: after breedingSeason (35) which resets stallion books, before
 * everything that touches the resulting pregnancies.
 */
export const npcBreedingPhase = {
  name: "npcBreeding",
  order: 38,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, dailyRng } = context;
    const result = runNpcBreeding(state, newDay, dailyRng);
    if (result.newPregnancies.length === 0 && result.logs.length === 0) return context;
    return {
      ...context,
      state: {
        ...state,
        horses: result.horses,
        npcStables: result.npcStables,
        pregnancies: [...result.newPregnancies, ...state.pregnancies],
      },
      logs: [...context.logs, ...result.logs],
    };
  },
};
