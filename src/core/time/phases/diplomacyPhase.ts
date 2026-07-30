/**
 * phases/diplomacyPhase.ts - Diplomacy phase
 *
 * Processes NPC-to-NPC diplomatic interactions: trust decay/growth,
 * alliance formation/dissolution, and cartel evaluation.
 * Runs after npcCyclePhase (order 80) so it has fresh AI state.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/ai/diplomacyAI (processDiplomaticInteractions, initializeRelationships), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase), index.ts (aggregates phase)
 */

import type { PipelineContext } from "../pipeline";
import { processDiplomaticInteractions, initializeRelationships } from "@/core/ai/diplomacyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { PHASE_ORDER_DIPLOMACY } from "@/constants";

export const diplomacyPhase = {
  name: "diplomacy",
  order: PHASE_ORDER_DIPLOMACY,
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

    // Initialize relationships if not yet present
    const hasRelationships = Object.values(aiManager.stableStates).some(
      (s) => s.npcRelationships !== undefined,
    );
    if (!hasRelationships) {
      aiManager = initializeRelationships(aiManager, state.npcStables);
    }

    // Process diplomatic interactions for this cycle
    aiManager = processDiplomaticInteractions(aiManager, state.npcStables, newDay);

    return {
      ...context,
      state: {
        ...state,
        npcAIManager: aiManager,
      },
    };
  },
};
