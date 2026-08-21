/**
 * phases/worldAssessmentPhase.ts - World assessment phase
 *
 * Runs the strategic coordinator's world state assessment early in the pipeline,
 * caching the result so subsequent phases (intent collection, NPC cycle) can use it.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/ai/strategicCoordinator (assessWorldState), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase), index.ts (aggregates phase)
 */

import type { PipelineContext } from "../pipeline";
import { assessWorldState } from "@/core/ai/strategicCoordinator";
import type { WorldAssessment } from "@/core/ai/strategicCoordinator";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { assessFinancialDistressWithPersonality } from "@/core/ai/financialDistressAI";
import { UPKEEP_PER_HORSE } from "@/constants";

const PHASE_ORDER_WORLD_ASSESSMENT = 2;

export const worldAssessmentPhase = {
  name: "worldAssessment",
  order: PHASE_ORDER_WORLD_ASSESSMENT,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    if (state.npcStables.length === 0) {
      return context;
    }

    const aiManager: NpcAIManager | undefined = (state as { npcAIManager?: NpcAIManager })
      .npcAIManager;
    if (!aiManager) {
      return context;
    }

    const worldAssessment: WorldAssessment = assessWorldState(state, aiManager);

    // Compute financial distress for each NPC stable and store on AI state.
    // This runs early (order 2) so all downstream phases have access.
    const horseCountsByStable = new Map<string, number>();
    for (const horse of Object.values(state.horses)) {
      if (horse.ownership?.type === "npc") {
        const sid = horse.ownership.stableId;
        horseCountsByStable.set(sid, (horseCountsByStable.get(sid) ?? 0) + 1);
      }
    }

    const updatedStableStates: Record<string, StableAIState> = Object.fromEntries(
      Object.entries(aiManager.stableStates).map(([id, s]) => {
        const stable = state.npcStables.find((st) => st.id === id);
        if (!stable) return [id, { ...s, worldAssessment }];

        const horseCount = horseCountsByStable.get(stable.id) ?? 0;
        const dailyUpkeep = horseCount * UPKEEP_PER_HORSE;
        const financialDistress = assessFinancialDistressWithPersonality(stable, dailyUpkeep);

        return [id, { ...s, worldAssessment, financialDistress }];
      }),
    );

    // Also compute distress for stables that don't yet have AI state
    for (const stable of state.npcStables) {
      if (!updatedStableStates[stable.id]) {
        const stableAI = getOrCreateStableAIState(aiManager, stable, newDay);
        const horseCount = horseCountsByStable.get(stable.id) ?? 0;
        const dailyUpkeep = horseCount * UPKEEP_PER_HORSE;
        stableAI.financialDistress = assessFinancialDistressWithPersonality(stable, dailyUpkeep);
        stableAI.worldAssessment = worldAssessment;
        updatedStableStates[stable.id] = stableAI;
      }
    }

    return {
      ...context,
      worldAssessment,
      state: {
        ...state,
        npcAIManager: {
          ...aiManager,
          stableStates: updatedStableStates,
        },
      },
    };
  },
};
