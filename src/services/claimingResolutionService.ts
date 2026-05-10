import type {
  AnyImpact,
  CashImpact,
  ClaimingImpact,
  LogImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/game/uuid";
import { formatCurrency } from "@/lib/formatting";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { processClaims, type ClaimAttempt } from "@/game/claiming";
import type { Rng } from "@/game/rng";
import type { Race, Horse } from "@/game/types";

export interface ProcessClaimingProps {
  race: Race;
  claimIntents: ClaimingIntent[];
  horses: Horse[];
  newDay: number;
  rng: Rng;
}

/**
 * Resolve claiming intents for a race and generate associated impacts.
 *
 * This includes handling refunds for withdrawn horses, processing successful claims
 * (transfers and payments), and logging results.
 *
 * @param props - Properties object for claiming resolution
 * @param props.race - The race being resolved
 * @param props.claimIntents - Array of player and NPC claiming intents
 * @param props.horses - Current global horse array
 * @param props.newDay - Current game day
 * @param props.rng - Random number generator for tie-breaking
 * @returns Object containing all generated Impacts
 */
export function processClaimingResolution({
  race,
  claimIntents,
  horses,
  newDay,
  rng,
}: ProcessClaimingProps): {
  impacts: AnyImpact[];
} {
  const impacts: AnyImpact[] = [];

  if (claimIntents.length === 0) {
    return { impacts };
  }

  // Filter out horses withdrawn from claiming
  const eligibleClaims = claimIntents.filter((claim) => {
    const entry = race.entries.find((e) => e.horseId === claim.horseId);
    return entry && !entry.withdrawnFromClaiming;
  });

  // Refund claimants for withdrawn horses
  const withdrawnClaims = claimIntents.filter((claim) => {
    const entry = race.entries.find((e) => e.horseId === claim.horseId);
    return entry && entry.withdrawnFromClaiming;
  });

  for (const withdrawnClaim of withdrawnClaims) {
    if (withdrawnClaim.claimantStableId) {
      impacts.push({
        id: generateUUID(),
        intentId: withdrawnClaim.id,
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "cash_change",
        entityId: withdrawnClaim.claimantStableId,
        amount: withdrawnClaim.claimingPrice,
        reason: `Refund for withdrawn horse ${withdrawnClaim.horseId} in ${race.name}`,
      } as CashImpact);
    } else {
      impacts.push({
        id: generateUUID(),
        intentId: withdrawnClaim.id,
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "cash_change",
        entityId: "",
        amount: withdrawnClaim.claimingPrice,
        reason: `Refund for withdrawn horse ${withdrawnClaim.horseId} in ${race.name}`,
      } as CashImpact);
    }

    impacts.push({
      id: generateUUID(),
      intentId: withdrawnClaim.id,
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "log",
      text: `Claim on ${withdrawnClaim.horseId} in ${race.name} refunded (horse withdrawn from claiming)`,
      reason: "Claiming refund",
    } as LogImpact);
  }

  if (eligibleClaims.length > 0) {
    // Convert ClaimingIntents to ClaimAttempt format for processClaims
    const claimAttempts: ClaimAttempt[] = eligibleClaims.map((intent) => ({
      claimantStableId: intent.claimantStableId || "",
      horseId: intent.horseId,
      claimingPrice: intent.claimingPrice,
      successful: false,
    }));

    // Process claims using existing function
    const { transfers, logs: claimLogs } = processClaims(race, claimAttempts, horses, newDay, rng);

    // Generate impacts for transfers
    for (const transfer of transfers) {
      // ClaimingImpact for horse transfer
      impacts.push({
        id: generateUUID(),
        intentId: eligibleClaims.find((i) => i.horseId === transfer.horseId)?.id || "",
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

      // CashImpact for claimant (negative)
      if (transfer.toStableId) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: transfer.toStableId,
          amount: -transfer.price,
          reason: `Claiming payment for ${transfer.horseId} in ${race.name}`,
        } as CashImpact);
      } else {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: "",
          amount: -transfer.price,
          reason: `Claiming payment for ${transfer.horseId} in ${race.name}`,
        } as CashImpact);
      }

      // CashImpact for original owner (positive)
      if (transfer.fromStableId) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: transfer.fromStableId,
          amount: transfer.price,
          reason: `Claiming proceeds for ${transfer.horseId} in ${race.name}`,
        } as CashImpact);
      } else {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: "",
          amount: transfer.price,
          reason: `Claiming proceeds for ${transfer.horseId} in ${race.name}`,
        } as CashImpact);
      }
    }

    // Generate log impacts for claim results
    for (const log of claimLogs) {
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "log",
        text: log,
        reason: "Claiming result",
      } as LogImpact);
    }

    // Refund losing claimants
    const winningHorseIds = new Set(transfers.map((t) => t.horseId));
    const losingClaims = eligibleClaims.filter((i) => !winningHorseIds.has(i.horseId));
    for (const losingClaim of losingClaims) {
      if (losingClaim.claimantStableId) {
        impacts.push({
          id: generateUUID(),
          intentId: losingClaim.id,
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: losingClaim.claimantStableId,
          amount: losingClaim.claimingPrice,
          reason: `Refund for failed claim on ${losingClaim.horseId} in ${race.name}`,
        } as CashImpact);
      } else {
        impacts.push({
          id: generateUUID(),
          intentId: losingClaim.id,
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: "",
          amount: losingClaim.claimingPrice,
          reason: `Refund for failed claim on ${losingClaim.horseId} in ${race.name}`,
        } as CashImpact);
      }
    }
  }

  return { impacts };
}
