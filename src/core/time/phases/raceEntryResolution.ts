// Race Entry Resolution Phase
// Converts RaceEntryIntents into impacts (race entry, cash changes)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, RaceEntryIntent } from "@/core/resolver/intents";
import type { AnyImpact, RaceEntryImpact } from "@/core/resolver/impacts";

/**
 * Race Entry Resolution Phase (Order 15)
 * Resolves RaceEntryIntents into impacts:
 * - Race entry (adds horse to race.entries)
 * - Entry fee (cash already deducted when intent was enqueued)
 */
export const raceEntryResolutionPhase: PipelinePhase = {
  name: "raceEntryResolution",
  order: 15,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Filter for race entry intents
    const raceEntryIntents = intents.filter((i): i is RaceEntryIntent => i.type === "race_entry");

    for (const intent of raceEntryIntents) {
      const race = state.races.find((r) => r.id === intent.raceId);
      const horse = state.horses.find((h) => h.id === intent.horseId);
      
      if (!race || !horse) continue;
      if (race.resolved) continue;
      if (race.entries.some((e) => e.horseId === intent.horseId)) continue;
      if (race.entries.length >= race.fieldSize) continue;

      // Generate race entry impact
      impacts.push({
        id: crypto.randomUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "raceEntryResolution",
        logLevel: "always",
        type: "race_entry",
        raceId: intent.raceId,
        horseId: intent.horseId,
        entryFee: race.entryFee,
        reason: "Race entry",
      });
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
