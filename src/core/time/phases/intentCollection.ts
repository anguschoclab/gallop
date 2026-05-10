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

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent } from "@/core/resolver/intents";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import { generateUUID } from "@/game/uuid";

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

    // Collect system intents: auto-managed campaign race entries
    if (state.campaigns) {
      for (const campaign of state.campaigns) {
        if (!campaign.autoManaged) continue;

        const horse = state.horses.find((h) => h.id === campaign.horseId);
        if (!horse || !horse.owned) continue;

        // Check for planned slots that are coming up (today or tomorrow)
        for (const slot of campaign.slots) {
          if (slot.status === "planned" && slot.raceId) {
            // If race is today or tomorrow
            if (slot.dayTarget >= newDay && slot.dayTarget <= newDay + 1) {
              const race = state.races.find((r) => r.id === slot.raceId);
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
                  context.logs.push({
                    day: newDay,
                    text: `Auto-campaign: ${horse.name} entered in ${race.name || "race"} at ${race.track || "track"}.`,
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
    };
  },
};
