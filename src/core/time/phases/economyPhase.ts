/**
 * phases/economyPhase.ts - Economy phase
 *
 * Updates global economic trends, processes cartel actions, and adjusts
 * market signals. Runs before marketPhase (order 50) so market decisions
 * can use fresh economic data.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/ai/economyAI (processEconomicCycle), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase), index.ts (aggregates phase)
 */

import type { PipelineContext } from "../pipeline";
import { processEconomicCycle } from "@/core/ai/economyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { PHASE_ORDER_ECONOMY } from "@/constants";

export const economyPhase = {
  name: "economy",
  order: PHASE_ORDER_ECONOMY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    if (state.npcStables.length === 0) {
      return context;
    }

    let aiManager: NpcAIManager = (state as { npcAIManager?: NpcAIManager }).npcAIManager || {
      stableStates: {},
      globalDay: newDay,
      regionalKings: {},
    };

    aiManager = processEconomicCycle(aiManager, state, newDay);

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
