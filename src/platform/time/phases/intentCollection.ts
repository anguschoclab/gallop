/**
 * phases/intentCollection.ts - Intent collection phase
 *
 * This file provides the intent collection phase that collects all intents
 * for the current day from player, NPCs, and system.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent), @/domains/agents/simulation/npc/intentGenerators (generateNpcIntents), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

// Intent Collection Phase
// Collects all intents for the current day from player, NPCs, and system

import { PHASE_ORDER_INTENT_COLLECTION } from "@/platform/time/pipelineConstants";;
import type { PipelineContext, PipelinePhase } from "@/platform/time/pipeline";
import type { AnyIntent } from "@/platform/resolver/intents";
import { generateNpcIntentsDetailed } from "@/domains/agents/simulation/npc/intentGenerators";
import { generateUUID } from "@/shared/uuid/uuid";

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
    // Pass cached worldAssessment and pre-built maps from pipeline context to avoid redundant computation
    const npcGeneration = generateNpcIntentsDetailed(
      state,
      newDay,
      context.worldAssessment,
      context.horseMap as Map<string, import("@/platform/game/types").Horse>,
      context.raceMap as Map<string, import("@/platform/game/types").Race>,
    );
    for (const intent of npcGeneration.intents) {
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

    const diagnosticLogs = npcGeneration.diagnostics.map((diagnostic) => ({
      day: diagnostic.day,
      text: `NPC intent generation skipped ${diagnostic.stableId}: ${diagnostic.message}`,
    }));

    return {
      ...context,
      intents,
      state: {
        ...state,
        npcAIManager: npcGeneration.npcAIManager ?? state.npcAIManager,
        pendingIntents: [], // Clear pending intents after collection
      },
      logs: [...autoEntryLogs, ...context.logs, ...diagnosticLogs],
    };
  },
};
