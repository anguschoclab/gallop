import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { LogImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { resolveClaims, type ClaimAttempt } from "@/core/market/claiming";
import type { Rng } from "@/core/common/rng";
import type { Race, Horse } from "@/game/types";
import {
  generateWithdrawnClaimLogs,
  generateClaimTransferImpacts,
  type ClaimResolutionInput,
} from "@/core/market/claimingImpacts";

export interface ProcessClaimingProps {
  race: Race;
  claims: ClaimResolutionInput[];
  horses: Horse[];
  newDay: number;
  rng: Rng;
  playerCash: number;
  stableCash: Map<string, number>;
}

export interface ClaimingResolutionResult {
  impacts: AnyImpact[];
  transfers: ReturnType<typeof resolveClaims>["transfers"];
  withdrawnClaims: ClaimResolutionInput[];
  voidedClaims: ClaimResolutionInput[];
  unaffordableClaims: ClaimResolutionInput[];
  losingClaims: ClaimResolutionInput[];
}

/**
 * Resolve persisted race claims for a race and generate associated impacts.
 * Claims do not escrow cash when filed; only the winning claimant pays. Losing
 * or withdrawn claims therefore produce outcomes/logs but no cash refund.
 * @param root0 - Claim-resolution inputs
 * @param root0.race - Resolved claiming race being settled
 * @param root0.claims - Persisted claims filed for the race
 * @param root0.horses - Horse records used for source ownership
 * @param root0.newDay - Day on which impacts are recorded
 * @param root0.rng - Seeded RNG used for deterministic winner selection
 * @param root0.playerCash - Current player cash used for affordability checks
 * @param root0.stableCash - NPC stable cash used for affordability checks
 */
export function resolveClaimingResolution({
  race,
  claims,
  horses,
  newDay,
  rng,
  playerCash,
  stableCash,
}: ProcessClaimingProps): ClaimingResolutionResult {
  if (claims.length === 0) {
    return {
      impacts: [],
      transfers: [],
      withdrawnClaims: [],
      voidedClaims: [],
      unaffordableClaims: [],
      losingClaims: [],
    };
  }

  const impacts: AnyImpact[] = [];
  const entryMap = new Map(race.entries.map((e) => [e.horseId, e]));

  const enteredClaims = claims.filter((claim) => entryMap.has(claim.horseId));
  const withdrawnClaims = enteredClaims.filter(
    (claim) => entryMap.get(claim.horseId)?.withdrawnFromClaiming,
  );
  const voidedClaims = claims.filter((claim) => !entryMap.has(claim.horseId));

  impacts.push(...generateWithdrawnClaimLogs(withdrawnClaims, race, newDay, rng));

  const remainingCash = new Map<string, number>();
  const affordableClaims: ClaimResolutionInput[] = [];
  const unaffordableClaims: ClaimResolutionInput[] = [];
  for (const claim of enteredClaims) {
    if (entryMap.get(claim.horseId)?.withdrawnFromClaiming) continue;
    const claimantId = claim.claimantStableId ?? "";
    const cash =
      remainingCash.get(claimantId) ??
      (claimantId ? (stableCash.get(claimantId) ?? 0) : playerCash);
    if (cash < claim.price) {
      unaffordableClaims.push(claim);
      continue;
    }
    remainingCash.set(claimantId, cash - claim.price);
    affordableClaims.push(claim);
  }

  for (const claim of unaffordableClaims) {
    impacts.push({
      id: generateUUID(rng),
      intentId: claim.id,
      day: newDay,
      phase: "claimResolution",
      logLevel: "always",
      type: "log",
      text: `Claim on ${claim.horseId} in ${race.name} failed (insufficient funds)`,
      reason: "Claiming failure",
    } as LogImpact);
  }

  const transfers: ClaimingResolutionResult["transfers"] = [];
  const losingClaims: ClaimResolutionInput[] = [];
  if (affordableClaims.length > 0) {
    const claimAttempts: ClaimAttempt[] = affordableClaims.map((claim) => ({
      claimantStableId: claim.claimantStableId || "",
      horseId: claim.horseId,
      claimingPrice: claim.price,
      successful: false,
    }));

    const claimMap = new Map(
      affordableClaims.map((claim) => [`${claim.horseId}:${claim.claimantStableId || ""}`, claim]),
    );
    const resolved = resolveClaims(race, claimAttempts, horses, newDay, rng);
    transfers.push(...resolved.transfers);

    impacts.push(...generateClaimTransferImpacts(transfers, race, claimMap, newDay, rng));

    for (const log of resolved.logs) {
      impacts.push({
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "claimResolution",
        logLevel: "always",
        type: "log",
        text: log,
        reason: "Claiming result",
      } as LogImpact);
    }

    const winningClaimKeys = new Set(transfers.map((t) => `${t.horseId}:${t.toStableId}`));
    losingClaims.push(
      ...affordableClaims.filter(
        (claim) => !winningClaimKeys.has(`${claim.horseId}:${claim.claimantStableId || ""}`),
      ),
    );
  }

  return {
    impacts,
    transfers,
    withdrawnClaims,
    voidedClaims,
    unaffordableClaims,
    losingClaims,
  };
}
