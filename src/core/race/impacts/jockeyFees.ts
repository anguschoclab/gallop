/**
 * jockeyFees.ts - Jockey fee impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { CashImpact, TransactionImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { JOCKEY_FEE_PERCENTAGE, BASE_JOCKEY_RIDING_FEE } from "@/constants/game";
import type { Horse, Jockey } from "@/game/types";

export function generateJockeyFeeImpacts(
  horse: Horse,
  jockey: Jockey,
  newDay: number,
  horseId: string,
  raceId: string,
  rng?: Rng,
): { cashImpact: CashImpact; transactionImpact?: TransactionImpact } {
  const ridingFee = jockey.ridingFee || BASE_JOCKEY_RIDING_FEE;

  const cashImpact: CashImpact = {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "cash_change",
    entityId: horse.stableId || "",
    amount: -ridingFee,
    reason: `Jockey fee: ${jockey.name}`,
  };

  let transactionImpact: TransactionImpact | undefined;

  if (!horse.stableId) {
    transactionImpact = {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "transaction",
      amount: -ridingFee,
      category: "jockey_fee",
      description: `Jockey fee: ${jockey.name} for ${horse.name}`,
      metadata: { horseId, raceId },
    } as TransactionImpact;
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
): CashImpact | null {
  const jockeyFee = Math.round(winAmount * JOCKEY_FEE_PERCENTAGE);
  if (jockeyFee <= 0) return null;

  return {
    id: generateUUID(rng),
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
