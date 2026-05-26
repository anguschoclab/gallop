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
import { getReputationTier } from "@/core/reputation";
import { PHASE_ORDER_NPC_CYCLE } from "@/game/constants";

/**
 * Phase: NPC Cycle
 * Run NPC training, race entry, fame updates, and AI state management
 */
export const npcCyclePhase = {
  name: "npcCycle",
  order: PHASE_ORDER_NPC_CYCLE,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Skip if no NPC stables
    if (state.npcStables.length === 0) {
      return context;
    }

    const pregnantIds = new Set(state.pregnancies.filter((p) => !p.resolved).map((p) => p.damId));

    // Get existing AI manager or create new one
    const aiManager: NpcAIManager = (state as { npcAIManager?: NpcAIManager }).npcAIManager || {
      stableStates: {},
      globalDay: newDay,
      regionalKings: {},
    };

    // Run the complete NPC cycle
    const {
      horses,
      races,
      jockeys,
      aiManager: updatedAiManager,
      newsItems,
      reputationEvents,
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

    // Apply news items to state
    const updatedNews = newsItems
      ? [...(newsItems || []), ...(state.news || [])].slice(0, 500)
      : state.news;

    // Apply reputation events
    let updatedReputation = (state as any).reputation;
    if (reputationEvents && reputationEvents.length > 0 && updatedReputation) {
      const newScore = Math.max(
        0,
        Math.min(
          1000,
          updatedReputation.score + reputationEvents.reduce((acc, e) => acc + e.amount, 0),
        ),
      );
      updatedReputation = {
        ...updatedReputation,
        score: newScore,
        tier: getReputationTier(newScore),
        events: [...reputationEvents, ...updatedReputation.events].slice(0, 100),
      };
    }

    return {
      ...context,
      state: {
        ...state,
        horses,
        races,
        jockeys,
        npcAIManager: updatedAiManager,
        news: updatedNews,
        reputation: updatedReputation,
      },
    };
  },
};
