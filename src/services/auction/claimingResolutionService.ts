import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { LogImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { processClaims, type ClaimAttempt } from "@/core/market/claiming";
import type { Rng } from "@/core/common/rng";
import type { Race, Horse } from "@/game/types";
import {
  generateWithdrawnClaimRefunds,
  generateClaimTransferImpacts,
  generateLosingClaimantRefunds,
} from "@/core/market/claimingImpacts";

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
 * Orchestrates: withdrawn claim refunds, successful claim transfers,
 * and losing claimant refunds.
 *
 * @param props - Properties object for claiming resolution
 * @param props.race
 * @param props.claimIntents
 * @param props.horses
 * @param props.newDay
 * @param props.rng
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
  if (claimIntents.length === 0) {
    return { impacts: [] };
  }

  const impacts: AnyImpact[] = [];
  const entryMap = new Map(race.entries.map((e) => [e.horseId, e]));

  const eligibleClaims = claimIntents.filter((claim) => {
    const entry = entryMap.get(claim.horseId);
    return entry && !entry.withdrawnFromClaiming;
  });

  const withdrawnClaims = claimIntents.filter((claim) => {
    const entry = entryMap.get(claim.horseId);
    return entry && entry.withdrawnFromClaiming;
  });

  impacts.push(...generateWithdrawnClaimRefunds(withdrawnClaims, race, newDay, rng));

  if (eligibleClaims.length > 0) {
    const claimAttempts: ClaimAttempt[] = eligibleClaims.map((intent) => ({
      claimantStableId: intent.claimantStableId || "",
      horseId: intent.horseId,
      claimingPrice: intent.claimingPrice,
      successful: false,
    }));

    const intentMap = new Map(
      eligibleClaims.map((i) => [`${i.horseId}:${i.claimantStableId || ""}`, i]),
    );
    const { transfers, logs: claimLogs } = processClaims(race, claimAttempts, horses, newDay, rng);

    impacts.push(...generateClaimTransferImpacts(transfers, race, intentMap, newDay, rng));

    for (const log of claimLogs) {
      impacts.push({
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "log",
        text: log,
        reason: "Claiming result",
      } as LogImpact);
    }

    const winningClaimKeys = new Set(
      transfers.map((t) => `${t.horseId}:${t.toStableId}`),
    );
    const losingClaims = eligibleClaims.filter(
      (i) => !winningClaimKeys.has(`${i.horseId}:${i.claimantStableId || ""}`),
    );
    impacts.push(...generateLosingClaimantRefunds(losingClaims, race, newDay, rng));
  }

  return { impacts };
}
