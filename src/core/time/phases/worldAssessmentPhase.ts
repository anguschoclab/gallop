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
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

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

    return {
      ...context,
      worldAssessment,
      state: {
        ...state,
        npcAIManager: {
          ...aiManager,
          stableStates: Object.fromEntries(
            Object.entries(aiManager.stableStates).map(([id, s]) => [
              id,
              { ...s, worldAssessment },
            ]),
          ),
        },
      },
    };
  },
};
