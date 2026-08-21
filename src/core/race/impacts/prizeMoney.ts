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
import { calculateRaceWinReputation, calculateRaceLossReputation } from "@/core/reputation";
import type { Race, Horse } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { getPrizeSplitForRace } from "../utils";

export function generatePrizeMoneyImpacts(
  horse: Horse,
  position: number,
  race: Race,
  newDay: number,
  rng?: Rng,
): {
  cashImpact?: CashImpact;
  transactionImpact?: TransactionImpact;
  reputationImpact?: ReputationImpact;
} | null {
  const prizeSplit = getPrizeSplitForRace(race);
  const inPrizeSplit = position - 1 < prizeSplit.length;
  const prize = inPrizeSplit ? Math.round(race.purse * prizeSplit[position - 1]) : 0;

  // If no prize and not eligible for reputation loss, return null
  if (prize <= 0 && !race.graded && position === 1) return null;
  if (prize <= 0 && !race.graded) return null;

  let cashImpact: CashImpact | undefined;
  let transactionImpact: TransactionImpact | undefined;
  let reputationImpact: ReputationImpact | undefined;

  // A horse with neither `owned` nor a stableId is unowned world stock — its
  // purse belongs to nobody and must never touch the player's cash.
  const playerOwned = isPlayerOwned(horse);
  const hasOwner = playerOwned || horse.ownership?.type === "npc";

  // Cash and transaction impacts only for in-prize-split positions
  if (inPrizeSplit && prize > 0 && hasOwner) {
    cashImpact = {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: (playerOwned ? "player" : horse.ownership?.type === "npc" ? horse.ownership.stableId : "") as string,
      amount: prize,
      reason: `Prize money: ${position}${getOrdinalSuffix(position)} in ${race.name}`,
    };

    if (playerOwned) {
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
        horseId: horse.id,
        raceId: race.id,
      };
    }
  }

  // Reputation impacts: win reputation for 1st place, loss reputation for poor finishes
  // Applies even when horse is outside prize split (especially in graded races)
  if (playerOwned) {
    if (position === 1 && inPrizeSplit) {
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
      };
    } else if (position > 1) {
      const fieldSize = race.entries?.length ?? race.fieldSize ?? position;
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
        };
      }
    }
  }

  if (!cashImpact && !reputationImpact) return null;

  return { cashImpact: cashImpact!, transactionImpact, reputationImpact };
}
