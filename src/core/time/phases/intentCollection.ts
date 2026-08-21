/**
 * phases/intentCollection.ts - Intent collection phase
 *
 * This file provides the intent collection phase that collects all intents
 * for the current day from player, NPCs, and system.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent), @/core/npc/intentGenerators (generateNpcIntents), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

// Intent Collection Phase
// Collects all intents for the current day from player, NPCs, and system

import { PHASE_ORDER_INTENT_COLLECTION } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent } from "@/core/resolver/intents";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import { generateUUID } from "@/core/uuid";

/**
 * Intent Collection Phase (Order 5)
 * Collects intents from:
 * - Player (from pendingIntents queue)
 * - NPCs (from NPC intent generators)
 * - System (auto-generated intents)
 */
export const intentCollectionPhase: PipelinePhase = {
  name: "intentCollection",
  order: PHASE_ORDER_INTENT_COLLECTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const intents: AnyIntent[] = [];
    const autoEntryLogs: { day: number; text: string }[] = [];

    // Collect player intents from pendingIntents queue
    if (state.pendingIntents && state.pendingIntents.length > 0) {
      for (const intent of state.pendingIntents) {
        intents.push(intent);
      }
    }

    // Collect NPC intents from NPC intent generators
    // Pass cached worldAssessment from worldAssessmentPhase to avoid redundant computation
    const npcIntents = generateNpcIntents(state, newDay, context.worldAssessment);
    for (const intent of npcIntents) {
      intents.push(intent);
    }

    // Collect system intents: auto-managed campaign race entries
    if (state.campaigns) {
      const { horseMap, raceMap } = context;
      for (const campaign of state.campaigns) {
        if (!campaign.autoManaged) continue;

        const horse = horseMap.get(campaign.horseId);
        if (!horse || horse.ownership?.type !== "player") continue;

        // Check for planned slots that are coming up (today or tomorrow)
        for (const slot of campaign.slots) {
          if (slot.status === "planned" && slot.raceId) {
            // If race is today or tomorrow
            if (slot.dayTarget >= newDay && slot.dayTarget <= newDay + 1) {
              const race = raceMap.get(slot.raceId);
              if (race && !race.resolved) {
                // Check if horse is already entered
                const alreadyEntered = race.entries.some((e) => e.horseId === horse.id);
                if (!alreadyEntered && race.entries.length < race.fieldSize) {
                  intents.push({
                    id: generateUUID(),
                    entityId: race.id,
                    source: "system",
                    day: newDay,
                    priority: 80, // System intents have high priority
                    type: "race_entry",
                    raceId: race.id,
                    horseId: horse.id,
                  });

                  // Log the auto-entry
                  autoEntryLogs.push({
                    day: newDay,
                    text: `Auto-campaign: ${horse.name} entered in ${race.name || "race"} at ${race.graded?.track || race.trackId || "track"}.`,
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      ...context,
      intents,
      state: {
        ...state,
        pendingIntents: [], // Clear pending intents after collection
      },
      logs: [...autoEntryLogs, ...context.logs],
    };
  },
};
