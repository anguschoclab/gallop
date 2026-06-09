/**
 * phases/raceEntryResolution.ts - Race entry resolution phase
 *
 * This file provides the race entry resolution phase that converts RaceEntryIntents
 * into impacts (race entry, cash changes).
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent, RaceEntryIntent), @/core/resolver/impacts/index (AnyImpact, RaceEntryImpact, CashImpact), @/core/transportation (createTransportRequest), @/core/transactions (createTransaction), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

// Race Entry Resolution Phase
// Converts RaceEntryIntents into impacts (race entry, cash changes)

import { PHASE_ORDER_RACE_ENTRY_RESOLUTION, BUMP_RATING_MARGIN } from "@/constants/game";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, RaceEntryIntent } from "@/core/resolver/intents";
import type { AnyImpact, RaceEntryImpact, CashImpact } from "@/core/resolver/impacts/index";
import { createTransportRequest } from "@/core/transportation";
import { createTransaction } from "@/core/transactions";
import { generateUUID } from "@/core/uuid";
import { selectBestJockey, createJockeyAIState } from "@/core/ai/jockeyAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { calculateOverallRating } from "@/core/horse/stats";

/**
 * Race Entry Resolution Phase (Order 15)
 * Resolves RaceEntryIntents into impacts:
 * - Race entry (adds horse to race.entries)
 * - Entry fee (cash already deducted when intent was enqueued)
 * - NPC Jockey assignment (automatically assigns jockeys to NPC entries)
 */
export const raceEntryResolutionPhase: PipelinePhase = {
  name: "raceEntryResolution",
  order: PHASE_ORDER_RACE_ENTRY_RESOLUTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];
    const newTransactions: typeof state.transactions = [];
    const newTransports = state.transports ?? [];

    // Filter for race entry intents
    const raceEntryIntents = intents.filter((i): i is RaceEntryIntent => i.type === "race_entry");

    const horseMap = new Map(state.horses.map((h) => [h.id, h]));
    const raceMap = new Map(state.races.map((r) => [r.id, r]));
    const jockeys = state.jockeys ?? [];
    const freeAgents = jockeys.filter((j) => !j.stableId && j.lastRaceDay !== newDay);

    // Sort free agents by fame for fallback selection
    freeAgents.sort((a, b) => b.fame - a.fame);

    for (const intent of raceEntryIntents) {
      const race = raceMap.get(intent.raceId);
      const horse = horseMap.get(intent.horseId);

      if (!race || !horse) continue;
      if (race.resolved) continue;
      if (race.entries.some((e: { horseId: string }) => e.horseId === intent.horseId)) continue;

      // Safety net: skip invite-only races for uninvited horses
      if (race.graded?.requiresInvitation) {
        const invitedIds = race.invitedHorseIds ?? race.graded.invitedHorseIds ?? [];
        const isInvited = invitedIds.includes(intent.horseId);
        const currentYear = Math.floor((newDay - 1) / 365) + 1;
        const isWinAndYouIn =
          race.graded.key &&
          horse.winAndYouInQualified?.some(
            (q: { raceKey: string; year: number }) => q.raceKey === race.graded!.key && q.year === currentYear,
          );
        if (!isInvited && !isWinAndYouIn) continue;
      }

      // Handle full races: attempt bump for NPC intents; passthrough for player intents
      // that already carry a bumpEntryHorseId (validated in enterRace store action).
      let bumpEntryHorseId: string | undefined;
      if (race.entries.length >= race.fieldSize) {
        if (intent.source === "player" && intent.bumpEntryHorseId) {
          // Player bump pre-validated in enterRace; just carry the target through
          bumpEntryHorseId = intent.bumpEntryHorseId;
        } else if (intent.source === "npc") {
          // CPU bump: find weakest non-player NPC entry
          const challengerRating = calculateOverallRating(horse);
          let weakestIdx = -1;
          let weakestRating = Infinity;
          for (let i = 0; i < race.entries.length; i++) {
            const entry = race.entries[i];
            if (entry.owned) continue; // never bump player
            const existing = horseMap.get(entry.horseId);
            if (!existing) continue;
            const r = calculateOverallRating(existing);
            if (r < weakestRating) {
              weakestRating = r;
              weakestIdx = i;
            }
          }
          if (weakestIdx === -1 || challengerRating <= weakestRating + BUMP_RATING_MARGIN) {
            continue; // can't bump anyone meaningfully
          }
          bumpEntryHorseId = race.entries[weakestIdx].horseId;
          // Update the local race snapshot so subsequent intents see the eviction
          race.entries.splice(weakestIdx, 1);
        } else {
          continue; // full race, no bump applicable
        }
      }

      let jockeyId = intent.jockeyId;

      // Automatically assign jockey for NPC entries if not specified
      if (!jockeyId && intent.source === "npc" && intent.sourceId) {
        const stable = state.npcStables.find((s) => s.id === intent.sourceId);
        if (stable) {
          // 1. Check for retainer
          const retainer = jockeys.find((j) => j.stableId === stable.id);
          if (retainer) {
            jockeyId = retainer.id;
          } else if (freeAgents.length > 0) {
            // 2. Use AI to select best free agent
            if (state.npcAIManager) {
              const stableAI = getOrCreateStableAIState(state.npcAIManager, stable, newDay);
              const jockeyAI =
                stableAI.jockeyAI || (stableAI.jockeyAI = createJockeyAIState(stable));
              const chosen = selectBestJockey(jockeyAI, horse, freeAgents, stable);
              if (chosen) {
                jockeyId = chosen.id;
              }
            }

            // 3. Fallback to best available if AI selection failed
            if (!jockeyId) {
              jockeyId = freeAgents[0].id;
            }
          }
        }
      }

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
        jockeyId,
        entryFee: race.entryFee,
        bumpEntryHorseId,
        jockeyInstructions: intent.jockeyInstructions,
        reason: bumpEntryHorseId ? "Race entry (bump)" : "Race entry",
      } as RaceEntryImpact);

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
