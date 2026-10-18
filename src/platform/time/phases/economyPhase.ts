/**
 * phases/economyPhase.ts - Economy phase
 *
 * Updates global economic trends, processes cartel actions, and adjusts
 * market signals. Runs before marketPhase (order 50) so market decisions
 * can use fresh economic data.
 *
 * Dependencies: ../pipeline (PipelineContext), @/domains/agents/simulation/economyAI (runEconomicCycle), @/domains/agents/simulation/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase), index.ts (aggregates phase)
 */

import type { PipelineContext } from "@/platform/time/pipeline";
import { runEconomicCycle } from "@/domains/agents/simulation/economyAITracking";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";
import { PHASE_ORDER_ECONOMY } from "@/platform/time/pipelineConstants";;

export const economyPhase = {
  name: "economy",
  order: PHASE_ORDER_ECONOMY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, worldAssessment } = context;

    if (state.npcStables.length === 0) {
      return context;
    }

    let aiManager: NpcAIManager = state.npcAIManager || {
      stableStates: {},
      globalDay: newDay,
      regionalKings: {},
    };

    aiManager = runEconomicCycle(aiManager, state, newDay);

    // Use worldAssessment to adjust economic state if available
    if (worldAssessment && aiManager.globalEconomicState) {
      // Player dominance affects stud fee trends: high player dominance pressures NPC studs
      const dominanceAdjustment = (worldAssessment.playerDominance - 0.5) * 5;
      aiManager = {
        ...aiManager,
        globalEconomicState: {
          ...aiManager.globalEconomicState,
          studFeeTrend: aiManager.globalEconomicState.studFeeTrend + dominanceAdjustment,
        },
      };
    }

    const economicTrend = aiManager.globalEconomicState ?? undefined;

    return {
      ...context,
      economicTrend,
      state: {
        ...state,
        npcAIManager: aiManager,
      },
    };
  },
};
