/**
 * jockeyFees.ts - Jockey fee impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { CashImpact, TransactionImpact } from "@/platform/resolver/impacts";
import type { Rng } from "@/shared/common/rng";
import { generateUUID } from "@/shared/uuid/uuid";
import {
  JOCKEY_FEE_PERCENTAGE,
  BASE_JOCKEY_RIDING_FEE,
} from "@/domains/jockey/model/jockeyConstants";
import type { Horse, Jockey } from "@/platform/game/types";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import { getJockeyName } from "@/domains/jockey/model/jockeyPerson";

export function generateJockeyFeeImpacts(
  horse: Horse,
  jockey: Jockey,
  newDay: number,
  horseId: string,
  raceId: string,
  rng?: Rng,
  getId?: () => string,
): { cashImpact: CashImpact; transactionImpact?: TransactionImpact } {
  const ridingFee = jockey.ridingFee || BASE_JOCKEY_RIDING_FEE;
  const playerOwned = isPlayerOwned(horse);

  const cashImpact: CashImpact = {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "cash_change",
    entityId: (playerOwned
      ? "player"
      : horse.ownership?.type === "npc"
        ? horse.ownership.stableId
        : "") as string,
    amount: -ridingFee,
    reason: `Jockey fee: ${getJockeyName(jockey)}`,
  };

  let transactionImpact: TransactionImpact | undefined;

  if (playerOwned) {
    transactionImpact = {
      id: getId ? getId() : generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "transaction",
      amount: -ridingFee,
      category: "jockey_fee",
      description: `Jockey fee: ${getJockeyName(jockey)} for ${horse.name}`,
      horseId,
      raceId,
    };
  }

  return { cashImpact, transactionImpact };
}

export function generatePercentageJockeyFeeImpacts(
  jockey: Jockey,
  winAmount: number,
  newDay: number,
  owned: boolean,
  stableId?: string,
  rng?: Rng,
  getId?: () => string,
): CashImpact | null {
  const jockeyFee = Math.round(winAmount * JOCKEY_FEE_PERCENTAGE);
  if (jockeyFee <= 0) return null;

  return {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "cash_change",
    entityId: owned ? "" : stableId || "",
    amount: -jockeyFee,
    reason: `Jockey fee for ${getJockeyName(jockey)}`,
  } as CashImpact;
}
