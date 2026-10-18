/**
 * claimingImpacts.ts - Impact generators for claiming resolution
 *
 * Extracted from claimingResolutionService.ts.
 */

import type { AnyImpact, CashImpact, ClaimingImpact, LogImpact } from "@/platform/resolver/impacts";
import { generateUUID } from "@/shared/uuid/uuid";
import { formatCurrency } from "@/shared/common/formatting";
import type { Rng } from "@/shared/common/rng";
import type { Race } from "@/platform/game/types";
import type { HorseTransfer } from "@/domains/market/simulation/claiming";

export interface ClaimResolutionInput {
  id: string;
  horseId: string;
  claimantStableId?: string;
  price: number;
}

export function generateWithdrawnClaimLogs(
  withdrawnClaims: ClaimResolutionInput[],
  race: Race,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  return withdrawnClaims.map(
    (claim) =>
      ({
        id: generateUUID(rng),
        intentId: claim.id,
        day: newDay,
        phase: "claimResolution",
        logLevel: "always",
        type: "log",
        text: `Claim on ${claim.horseId} in ${race.name} voided (horse withdrawn from claiming)`,
        reason: "Claiming withdrawal",
      }) as LogImpact,
  );
}

export function generateClaimTransferImpacts(
  transfers: HorseTransfer[],
  race: Race,
  claimMap: Map<string, ClaimResolutionInput>,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  for (const transfer of transfers) {
    impacts.push({
      id: generateUUID(rng),
      intentId: claimMap.get(`${transfer.horseId}:${transfer.toStableId}`)?.id || "",
      day: newDay,
      phase: "claimResolution",
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
      phase: "claimResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: transfer.toStableId || "player",
      amount: -transfer.price,
      reason: `Claiming payment for ${transfer.horseId} in ${race.name}`,
    } as CashImpact);

    impacts.push({
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "claimResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: transfer.fromStableId || "player",
      amount: transfer.price,
      reason: `Claiming proceeds for ${transfer.horseId} in ${race.name}`,
    } as CashImpact);
  }

  return impacts;
}
