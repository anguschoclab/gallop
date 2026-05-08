// Race Entry Resolution Phase
// Converts RaceEntryIntents into impacts (race entry, cash changes)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, RaceEntryIntent } from "@/core/resolver/intents";
import type { AnyImpact, RaceEntryImpact, CashImpact } from "@/core/resolver/impacts";
import { createTransportRequest } from "@/core/transportation";
import { createTransaction } from "@/core/transactions";
import { generateUUID } from "@/game/uuid";

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
    const newTransactions: typeof state.transactions = [];
    const newTransports = state.transports ?? [];

    // Filter for race entry intents
    const raceEntryIntents = intents.filter((i): i is RaceEntryIntent => i.type === "race_entry");

    const horseMap = new Map(state.horses.map(h => [h.id, h]));
    const raceMap = new Map(state.races.map(r => [r.id, r]));

    for (const intent of raceEntryIntents) {
      const race = raceMap.get(intent.raceId);
      const horse = horseMap.get(intent.horseId);

      if (!race || !horse) continue;
      if (race.resolved) continue;
      if (race.entries.some((e) => e.horseId === intent.horseId)) continue;
      if (race.entries.length >= race.fieldSize) continue;


      // Generate race entry impact
      impacts.push({
        id: generateUUID(),
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

      // Add transport cost for player-owned horses (simplified: fixed cost based on race grade)
      if (!horse.stableId) {
        // Simplified transport cost calculation based on race grade
        const transportCost = race.graded
          ? race.graded.grade === "G1"
            ? 500
            : race.graded.grade === "G2"
              ? 400
              : race.graded.grade === "G3"
                ? 300
                : 200
          : 150;

        // Add transport expense impact
        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "raceEntryResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: "",
          amount: -transportCost,
          reason: `Transport to ${race.name}`,
        } as CashImpact);

        // Record transaction for transport expense
        newTransactions.push(
          createTransaction(
            "expense",
            "transport",
            -transportCost,
            `Transport to ${race.name}`,
            newDay,
            state.cash - transportCost,
            { horseId: horse.id, raceId: race.id },
          ),
        );

        // Create transport request
        const transportRequest = createTransportRequest(
          horse.id,
          "Home Stable",
          race.graded?.track ?? race.name,
          100, // Simplified distance
          newDay,
          "road",
        );
        newTransports.push(transportRequest);
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
      state: {
        ...state,
        transactions: [...(state.transactions ?? []), ...newTransactions],
        transports: newTransports,
      },
    };
  },
};
