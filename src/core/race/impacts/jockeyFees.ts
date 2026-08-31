/**
 * jockeyFees.ts - Jockey fee impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { CashImpact, TransactionImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { JOCKEY_FEE_PERCENTAGE, BASE_JOCKEY_RIDING_FEE } from "@/constants";
import type { Horse, Jockey } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";

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
    reason: `Jockey fee: ${jockey.name}`,
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
      description: `Jockey fee: ${jockey.name} for ${horse.name}`,
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
    reason: `Jockey fee for ${jockey.name}`,
  } as CashImpact;
}
