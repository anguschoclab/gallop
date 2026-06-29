/**
 * phases/claimingWithdrawal.ts - Claiming withdrawal phase
 *
 * This file provides the claiming withdrawal phase that processes
 * WithdrawFromClaimingIntents to mark horses as withdrawn from claiming.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent, WithdrawFromClaimingIntent), @/core/resolver/impacts/index (AnyImpact, LogImpact), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

// Claiming Withdrawal Phase
// Processes WithdrawFromClaimingIntents to mark horses as withdrawn from claiming

import { PHASE_ORDER_CLAIMING_WITHDRAWAL } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, WithdrawFromClaimingIntent } from "@/core/resolver/intents";
import type { AnyImpact, LogImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";

/**
 * Claiming Withdrawal Phase (Order 67)
 * Processes WithdrawFromClaimingIntents to mark horses as withdrawn from claiming
 * in optional claiming races. This runs after beyerRecalibration (65) and before raceResolution (70).
 */
export const claimingWithdrawalPhase: PipelinePhase = {
  name: "claimingWithdrawal",
  order: PHASE_ORDER_CLAIMING_WITHDRAWAL,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, intents, newDay } = context;
    const impacts: AnyImpact[] = [];
    const races = [...state.races];
    let racesChanged = false;

    const withdrawalIntents = intents.filter(
      (i): i is WithdrawFromClaimingIntent => i.type === "withdraw_from_claiming",
    );

    for (const intent of withdrawalIntents) {
      const raceIndex = races.findIndex((r) => r.id === intent.raceId);
      if (raceIndex === -1) continue;
      const race = races[raceIndex];

      const entryIndex = race.entries.findIndex((e) => e.horseId === intent.horseId);
      if (entryIndex === -1) continue;
      const entry = race.entries[entryIndex];
      if (entry.withdrawnFromClaiming) continue;

      // Update the entry immutably within the races array.
      races[raceIndex] = {
        ...race,
        entries: race.entries.map((e, i) =>
          i === entryIndex ? { ...e, withdrawnFromClaiming: true } : e,
        ),
      };
      racesChanged = true;

      // Log the withdrawal (race entry fee is lost as penalty)
      impacts.push({
        id: generateUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "claimingWithdrawal",
        logLevel: "always",
        type: "log",
        text: `Horse withdrawn from claiming in ${race.name} (entry fee forfeited)`,
        reason: "Claiming withdrawal",
      } as LogImpact);
    }

    return {
      ...context,
      state: {
        ...state,
        races: racesChanged ? races : state.races,
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
