// Intent Collection Phase
// Collects all intents for the current day from player, NPCs, and system

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent } from "@/core/resolver/intents";
import { generateNpcIntents } from "@/core/npc/intentGenerators";

/**
 * Intent Collection Phase (Order 5)
 * Collects intents from:
 * - Player (from pendingIntents queue)
 * - NPCs (from NPC intent generators)
 * - System (auto-generated intents)
 */
export const intentCollectionPhase: PipelinePhase = {
  name: "intentCollection",
  order: 5,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const intents: AnyIntent[] = [];

    // Collect player intents from pendingIntents queue
    if (state.pendingIntents && state.pendingIntents.length > 0) {
      for (const intent of state.pendingIntents) {
        intents.push(intent);
      }
    }

    // Collect NPC intents from NPC intent generators
    const npcIntents = generateNpcIntents(state, newDay);
    for (const intent of npcIntents) {
      intents.push(intent);
    }


    // Collect system intents (placeholder)
    // TODO: Generate system intents (e.g., auto race entries from campaign planner)

    return {
      ...context,
      intents,
      state: {
        ...state,
        pendingIntents: [], // Clear pending intents after collection
      },
    };
  },
};
