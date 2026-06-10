/**
 * claimingImpacts.ts - Impact generators for claiming resolution
 *
 * Extracted from claimingResolutionService.ts.
 */

import type {
  AnyImpact,
  CashImpact,
  ClaimingImpact,
  LogImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { formatCurrency } from "@/lib/formatting";
import type { ClaimingIntent } from "@/core/resolver/intents";
import type { Rng } from "@/core/common/rng";
import type { Race } from "@/game/types";
import type { HorseTransfer } from "@/core/market/claiming";

export function generateWithdrawnClaimRefunds(
  withdrawnClaims: ClaimingIntent[],
  race: Race,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  for (const withdrawnClaim of withdrawnClaims) {
    impacts.push({
      id: generateUUID(rng),
      intentId: withdrawnClaim.id,
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: withdrawnClaim.claimantStableId || "",
      amount: withdrawnClaim.claimingPrice,
      reason: `Refund for withdrawn horse ${withdrawnClaim.horseId} in ${race.name}`,
    } as CashImpact);

    impacts.push({
      id: generateUUID(rng),
      intentId: withdrawnClaim.id,
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "log",
      text: `Claim on ${withdrawnClaim.horseId} in ${race.name} refunded (horse withdrawn from claiming)`,
      reason: "Claiming refund",
    } as LogImpact);
  }

  return impacts;
}

export function generateClaimTransferImpacts(
  transfers: HorseTransfer[],
  race: Race,
  intentMap: Map<string, ClaimingIntent>,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  for (const transfer of transfers) {
    impacts.push({
      id: generateUUID(rng),
      intentId: intentMap.get(transfer.horseId)?.id || "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "claiming",
      raceId: race.id,
      horseId: transfer.horseId,
      fromStableId: transfer.fromStableId,
      toStableId: transfer.toStableId,
      claimingPrice: transfer.price,
      reason: `Claimed for ${formatCurrency(transfer.price)} after ${race.name}`,
    } as ClaimingImpact);

    impacts.push({
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: transfer.toStableId || "",
      amount: -transfer.price,
      reason: `Claiming payment for ${transfer.horseId} in ${race.name}`,
    } as CashImpact);

    impacts.push({
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: transfer.fromStableId || "",
      amount: transfer.price,
      reason: `Claiming proceeds for ${transfer.horseId} in ${race.name}`,
    } as CashImpact);
  }

  return impacts;
}

export function generateLosingClaimantRefunds(
  losingClaims: ClaimingIntent[],
  race: Race,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  for (const losingClaim of losingClaims) {
    impacts.push({
      id: generateUUID(rng),
      intentId: losingClaim.id,
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: losingClaim.claimantStableId || "",
      amount: losingClaim.claimingPrice,
      reason: `Refund for failed claim on ${losingClaim.horseId} in ${race.name}`,
    } as CashImpact);
  }

  return impacts;
}
