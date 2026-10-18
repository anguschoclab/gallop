/**
 * phases/claimResolution.ts - Claim resolution phase
 *
 * Settles persisted claims after race resolution. Claims are filed by
 * claimRegistration and applied exactly once here; losing and withdrawn claims
 * leave state without producing cash impacts.
 */

import type { PipelineContext } from "@/platform/time/pipeline";
import type { Claim, GameState, Horse } from "@/platform/game/types";
import { PHASE_ORDER_CLAIM_RESOLUTION } from "@/platform/time/pipelineConstants";;
import type { AnyImpact } from "@/platform/resolver/impacts";
import { applyClaimingFriction } from "@/domains/agents/simulation/diplomacyAI";
import { trackClaimingActivity } from "@/domains/agents/simulation/economyAITracking";
import { resolveClaimingResolution } from "@/domains/auction/simulation/claimingResolutionService";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";
import { getOrCreateStableAIState } from "@/domains/agents/simulation/npcCycleAI";
import { createClaimingAIState } from "@/domains/agents/simulation/claimingAITypes";
import { recordClaimingOutcome } from "@/domains/agents/simulation/claimingAIRecording";
import { calculateOverallRating } from "@/domains/horse/simulation/stats";

function cloneNpcAIManager(manager: NpcAIManager | undefined): NpcAIManager | undefined {
  if (!manager) return undefined;
  return {
    ...manager,
    stableStates: Object.fromEntries(
      Object.entries(manager.stableStates).map(([id, stableState]) => [id, { ...stableState }]),
    ),
  };
}

function recordOutcome(
  manager: NpcAIManager | undefined,
  state: GameState,
  claim: Claim,
  success: boolean,
  value: number,
  newDay: number,
): void {
  if (!manager || !claim.claimantStableId) return;
  const stable = state.npcStables.find((s) => s.id === claim.claimantStableId);
  if (!stable) return;
  const stableAI = getOrCreateStableAIState(manager, stable, newDay);
  const claimingAI = stableAI.claimingAI ?? createClaimingAIState(stable);
  stableAI.claimingAI = recordClaimingOutcome(
    claimingAI,
    claim.horseId,
    claim.raceId,
    success,
    value,
    newDay,
  );
  manager.stableStates[stable.id] = stableAI;
}

/**
 * Phase: Claim Resolution
 * After races have been resolved, settle all claims filed for those races.
 */
export const claimResolutionPhase = {
  name: "claimResolution",
  order: PHASE_ORDER_CLAIM_RESOLUTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs } = context;
    const allClaims: Claim[] = state.claims ?? [];
    const { horseMap } = context;

    const claimsToday = allClaims.filter((claim) => {
      const race = state.races[claim.raceId];
      return race?.resolved && race.day === newDay && race.claimingPrice !== undefined;
    });

    if (claimsToday.length === 0) return context;

    const impacts: AnyImpact[] = [];
    const newLogs = [...logs];
    const claimsByRace = new Map<string, Claim[]>();
    for (const claim of claimsToday) {
      const raceClaims = claimsByRace.get(claim.raceId) ?? [];
      raceClaims.push(claim);
      claimsByRace.set(claim.raceId, raceClaims);
    }

    let privateSaleOffers = [...(state.privateSaleOffers ?? [])];
    let playerCash = state.cash;
    const stableCash = new Map(state.npcStables.map((stable) => [stable.id, stable.cash]));
    let npcAIManager = cloneNpcAIManager(state.npcAIManager);
    const consumedClaimIds = new Set<string>();
    const transferredHorseIds = new Set<string>();
    let claimActivityCount = 0;

    for (const [raceId, raceClaims] of claimsByRace) {
      const race = state.races[raceId];
      if (!race) continue;
      const result = resolveClaimingResolution({
        race,
        claims: raceClaims,
        horses: Object.values(state.horses),
        newDay,
        rng: context.dailyRng,
        playerCash,
        stableCash,
      });
      impacts.push(...result.impacts);
      claimActivityCount += raceClaims.length;

      const winningKeys = new Set(
        result.transfers.map((transfer) => `${transfer.horseId}:${transfer.toStableId}`),
      );
      const withdrawnIds = new Set(result.withdrawnClaims.map((claim) => claim.id));
      const voidedIds = new Set(result.voidedClaims.map((claim) => claim.id));
      const unaffordableIds = new Set(result.unaffordableClaims.map((claim) => claim.id));
      const losingIds = new Set(result.losingClaims.map((claim) => claim.id));

      for (const claim of raceClaims) {
        consumedClaimIds.add(claim.id);
        const won = winningKeys.has(`${claim.horseId}:${claim.claimantStableId ?? ""}`);
        const horse = horseMap.get(claim.horseId);
        if (won && horse) {
          transferredHorseIds.add(claim.horseId);
          recordOutcome(
            npcAIManager,
            state,
            claim,
            true,
            calculateOverallRating(horse as Horse) * 1000 - claim.price,
            newDay,
          );
        } else if (
          withdrawnIds.has(claim.id) ||
          voidedIds.has(claim.id) ||
          unaffordableIds.has(claim.id) ||
          losingIds.has(claim.id)
        ) {
          recordOutcome(npcAIManager, state, claim, false, 0, newDay);
        }
      }

      for (const transfer of result.transfers) {
        if (transfer.toStableId) {
          stableCash.set(
            transfer.toStableId,
            (stableCash.get(transfer.toStableId) ?? 0) - transfer.price,
          );
        } else {
          playerCash -= transfer.price;
        }
        if (transfer.fromStableId && transfer.toStableId && npcAIManager) {
          npcAIManager = applyClaimingFriction(
            npcAIManager,
            transfer.toStableId,
            transfer.fromStableId,
          );
        }
      }

      privateSaleOffers = privateSaleOffers.map((offer) =>
        transferredHorseIds.has(offer.horseId) &&
        (offer.status === "pending" || offer.status === "countered")
          ? { ...offer, status: "declined" as const }
          : offer,
      );
    }

    if (npcAIManager) {
      npcAIManager = trackClaimingActivity(npcAIManager, claimActivityCount);
    }

    return {
      ...context,
      state: {
        ...context.state,
        claims: allClaims.filter((claim) => !consumedClaimIds.has(claim.id)),
        privateSaleOffers,
        ...(npcAIManager ? { npcAIManager } : {}),
      },
      impacts: [...context.impacts, ...impacts],
      logs: newLogs,
    };
  },
};
