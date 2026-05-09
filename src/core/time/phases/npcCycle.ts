/**
 * phases/npcCycle.ts - NPC cycle phase
 *
 * This file provides the NPC cycle phase that runs NPC training, race entry,
 * fame updates, and AI state management.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/npc/npcCycle (runNpcCycle), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { runNpcCycle } from "@/core/npc/npcCycle";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

/**
 * Phase: NPC Cycle
 * Run NPC training, race entry, fame updates, and AI state management
 */
export const npcCyclePhase = {
  name: "npcCycle",
  order: 80,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Skip if no NPC stables
    if (state.npcStables.length === 0) {
      return context;
    }

    const pregnantIds = new Set(state.pregnancies.filter((p) => !p.resolved).map((p) => p.damId));

    // Get existing AI manager or create new one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiManager: NpcAIManager = (state as any).npcAIManager || {
      stableStates: new Map(),
      globalDay: newDay,
    };

    // Run the complete NPC cycle
    const {
      horses,
      races,
      jockeys,
      aiManager: updatedAiManager,
    } = runNpcCycle(
      state.npcStables,
      state.horses,
      state.jockeys ?? [],
      state.races,
      newDay,
      context.dailyRng,
      3,
      pregnantIds,
      aiManager,
    );

    return {
      ...context,
      state: {
        ...state,
        horses,
        races,
        jockeys,
        npcAIManager: updatedAiManager,
      },
    };
  },
};
