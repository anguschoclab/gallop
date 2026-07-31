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
import { runAutonomousBreeding } from "@/core/npc/breeding";
import { PHASE_ORDER_NPC_BREEDING } from "@/constants";
import { trackBreedingVolume } from "@/core/ai/economyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

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
  order: PHASE_ORDER_NPC_BREEDING,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, dailyRng } = context;

    // Count pregnancies before breeding to measure volume
    const pregnanciesBefore = state.pregnancies.filter((p) => !p.resolved).length;

    const updatedState = runAutonomousBreeding(state, state.npcStables, dailyRng);

    // Track breeding volume for economic signals (Phase 5b)
    const pregnanciesAfter = updatedState.pregnancies.filter((p) => !p.resolved).length;
    const newBreedings = pregnanciesAfter - pregnanciesBefore;

    if (newBreedings > 0 && updatedState.npcAIManager) {
      // Estimate total stud fees from sire standing fees
      const newPregnancies = updatedState.pregnancies.filter(
        (p) => !p.resolved && !state.pregnancies.some((old) => old.id === p.id),
      );
      const totalStudFees = newPregnancies.reduce((sum, p) => {
        const sire = updatedState.horses[p.sireId];
        return sum + (sire?.stud?.standingFee ?? 0);
      }, 0);

      const updatedManager = trackBreedingVolume(
        updatedState.npcAIManager as NpcAIManager,
        newBreedings,
        totalStudFees,
      );

      return {
        ...context,
        state: {
          ...updatedState,
          npcAIManager: updatedManager,
        },
      };
    }

    return {
      ...context,
      state: updatedState,
    };
  },
};
