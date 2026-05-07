// Claiming Withdrawal Phase
// Processes WithdrawFromClaimingIntents to mark horses as withdrawn from claiming

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, WithdrawFromClaimingIntent } from "@/core/resolver/intents";
import type { AnyImpact, LogImpact } from "@/core/resolver/impacts";
import { generateUUID } from "@/game/uuid";

/**
 * Claiming Withdrawal Phase (Order 67)
 * Processes WithdrawFromClaimingIntents to mark horses as withdrawn from claiming
 * in optional claiming races. This runs after beyerRecalibration (65) and before raceResolution (70).
 */
export const claimingWithdrawalPhase: PipelinePhase = {
  name: "claimingWithdrawal",
  order: 67,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, intents, newDay } = context;
    const impacts: AnyImpact[] = [];

    const withdrawalIntents = intents.filter(
      (i): i is WithdrawFromClaimingIntent => i.type === "withdraw_from_claiming",
    );

    for (const intent of withdrawalIntents) {
      const race = state.races.find((r) => r.id === intent.raceId);
      if (!race) continue;

      const entry = race.entries.find((e) => e.horseId === intent.horseId);
      if (!entry) continue;

      // Mark entry as withdrawn from claiming
      entry.withdrawnFromClaiming = true;

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
      impacts: [...context.impacts, ...impacts],
    };
  },
};
