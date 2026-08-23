import type { ClaimingIntent, WithdrawFromClaimingIntent } from "@/core/resolver/intents";
import type { GameState, Horse, Race, Stable } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { isHorseEligibleForClaimingPrice } from "@/core/market/claiming";
import { createClaimingAIState } from "@/core/ai/claimingAITypes";
import { shouldClaimHorse, recordClaimingDecision } from "@/core/ai/claimingAIRecording";
import { createWithdrawalAIState } from "@/core/ai/withdrawalAITypes";
import { shouldWithdrawHorse, recordWithdrawalDecision } from "@/core/ai/withdrawalAIRecording";
import type { StableAIState } from "@/core/ai/npcCycleAI";

export function generateNpcClaimingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  upcomingRaces: Race[],
  horseMap: Map<string, Horse>,
  claimingWeight = 1.0,
): ClaimingIntent[] {
  const intents: ClaimingIntent[] = [];

  let claimingAI = stableAI?.claimingAI ?? createClaimingAIState(stable);

  const claimingBudget = stableAI?.budgetAllocation?.claiming;
  let cumulativeClaimSpend = 0;

  for (const race of upcomingRaces) {
    if (!race.claimingPrice) continue;

    for (const entry of race.entries) {
      const horse = horseMap.get(entry.horseId);

      if (!horse) continue;
      if (horse.ownership?.type === "npc" && horse.ownership.stableId === stable.id) continue;

      const horseStableId = horse.ownership?.type === "npc" ? horse.ownership.stableId : undefined;
      if (horseStableId && stableAI?.npcRelationships?.[horseStableId]) {
        const rel = stableAI.npcRelationships[horseStableId];
        if (
          rel.allianceType === "breeding_partnership" ||
          rel.allianceType === "racing_coalition"
        ) {
          continue;
        }
      }

      if (claimingBudget !== undefined && claimingBudget <= 0) continue;
      if (
        claimingBudget !== undefined &&
        cumulativeClaimSpend + race.claimingPrice > claimingBudget
      ) {
        continue;
      }

      const friction = stableAI?.friction ?? 0;
      if (shouldClaimHorse(claimingAI, horse, race, stable, day, friction, claimingWeight)) {
        if (
          !isHorseEligibleForClaimingPrice(horse, race.claimingPrice, Object.values(state.horses))
        )
          continue;

        claimingAI = recordClaimingDecision(claimingAI, horse, race, stable, day);
        cumulativeClaimSpend += race.claimingPrice;

        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 60,
          type: "claiming",
          raceId: race.id,
          horseId: horse.id,
          claimantStableId: stable.id,
          claimingPrice: race.claimingPrice,
        });
      }
    }
  }

  return intents;
}

export function generateNpcWithdrawalIntents(
  _state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  upcomingRaces: Race[],
  horseMap: Map<string, Horse>,
): WithdrawFromClaimingIntent[] {
  const intents: WithdrawFromClaimingIntent[] = [];

  let withdrawalAI =
    stableAI?.withdrawalAI ||
    (stableAI
      ? (stableAI.withdrawalAI = createWithdrawalAIState(stable))
      : createWithdrawalAIState(stable));

  for (const race of upcomingRaces) {
    if (!race.claimingPrice) continue;

    for (const entry of race.entries) {
      if (entry.ownership?.type !== "npc" || entry.ownership.stableId !== stable.id) continue;

      const horse = horseMap.get(entry.horseId);
      if (!horse) continue;

      const { shouldWithdraw, reason } = shouldWithdrawHorse(
        withdrawalAI,
        horse,
        race,
        stable,
        day,
      );

      if (shouldWithdraw) {
        withdrawalAI = recordWithdrawalDecision(
          withdrawalAI,
          horse,
          race,
          stable,
          true,
          reason || "risk_assessment",
          day,
        );

        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 70,
          type: "withdraw_from_claiming",
          raceId: race.id,
          horseId: horse.id,
        });
      }
    }
  }

  return intents;
}
