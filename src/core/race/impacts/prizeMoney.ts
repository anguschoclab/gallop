/**
 * prizeMoney.ts - Prize money and reputation impact generator
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type {
  CashImpact,
  TransactionImpact,
  ReputationImpact,
} from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { GRADED_PRIZE_SPLIT, PRIZE_SPLIT } from "@/constants";
import { calculateRaceWinReputation, calculateRaceLossReputation } from "@/core/reputation";
import type { Race, Horse } from "@/game/types";

function getPrizeSplitForRace(race: Race): number[] {
  if (race.graded) return GRADED_PRIZE_SPLIT;
  return PRIZE_SPLIT;
}

export function generatePrizeMoneyImpacts(
  horse: Horse,
  position: number,
  race: Race,
  newDay: number,
  rng?: Rng,
): {
  cashImpact: CashImpact;
  transactionImpact?: TransactionImpact;
  reputationImpact?: ReputationImpact;
} | null {
  const prizeSplit = getPrizeSplitForRace(race);
  if (position - 1 >= prizeSplit.length) return null;

  const prize = Math.round(race.purse * prizeSplit[position - 1]);
  if (prize <= 0) return null;

  const cashImpact: CashImpact = {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "cash_change",
    entityId: horse.stableId || "",
    amount: prize,
    reason: `Prize money: ${position}${getOrdinalSuffix(position)} in ${race.name}`,
  };

  let transactionImpact: TransactionImpact | undefined;
  let reputationImpact: ReputationImpact | undefined;

  if (!horse.stableId) {
    transactionImpact = {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "transaction",
      amount: prize,
      category: "prize_money",
      description: `Prize money: ${position}${getOrdinalSuffix(position)} in ${race.name}`,
      metadata: { horseId: horse.id, raceId: race.id },
    } as TransactionImpact;

    if (position === 1) {
      const repGain = calculateRaceWinReputation(race.graded?.grade, race.purse);
      reputationImpact = {
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "reputation_change",
        delta: repGain,
        source: "race_win",
        reason: `Win in ${race.name}${race.graded ? ` (${race.graded.grade})` : ""}`,
        metadata: { horseId: horse.id, raceId: race.id },
      } as ReputationImpact;
    } else {
      const fieldSize = race.entries?.length || position;
      const consecutiveLosses = horse.raceHistory
        ? horse.raceHistory
            .slice()
            .reverse()
            .filter((h) => h.raceId !== race.id)
            .findIndex((h) => h.position === 1)
        : 0;
      const effectiveConsecutiveLosses = consecutiveLosses === -1 ? 99 : consecutiveLosses;

      const repLoss = calculateRaceLossReputation(
        race.graded?.grade,
        position,
        fieldSize,
        effectiveConsecutiveLosses,
      );

      if (repLoss < 0) {
        reputationImpact = {
          id: generateUUID(rng),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "always",
          type: "reputation_change",
          delta: repLoss,
          source: "race_loss",
          reason: `Poor finish (${position}${getOrdinalSuffix(position)} of ${fieldSize}) in ${race.name}${race.graded ? ` (${race.graded.grade})` : ""}`,
          metadata: { horseId: horse.id, raceId: race.id },
        } as ReputationImpact;
      }
    }
  }

  return { cashImpact, transactionImpact, reputationImpact };
}
