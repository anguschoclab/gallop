/**
 * phases/claimResolution.ts - Claim resolution phase
 *
 * This file provides the claim resolution phase that settles all claims after
 * races have been resolved, including cash transfers and horse ownership transfers.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (Race, Claim, Horse, Stable), @/game/auction (netProceeds), @/game/rng (hashStr), @/game/uuid (generateUUID), @/lib/formatting (formatCurrency)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import type { Race, Claim, Horse, Stable } from "@/game/types";
import { netProceeds } from "@/core/auction/engine";
import { hashStr } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { PHASE_ORDER_CLAIM_RESOLUTION } from "@/constants";
import { formatCurrency } from "@/core/common/formatting";
import type { AnyImpact } from "@/core/resolver/impacts/index";

/**
 * Phase: Claim Resolution
 * After races have been resolved, settle all claims.
 *
 * For each claiming race:
 *   - Group claims by horse
 *   - Randomly select a winner per horse (seeded by raceId + horseId)
 *   - Debit claimant's cash, credit original owner's net proceeds
 *   - Transfer horse ownership
 *   - Emit ClaimResolutionImpact via logs
 *
 * Prize money is credited to the original owner by the race resolution phase,
 * so no adjustment is needed here.
 */
export const claimResolutionPhase = {
  name: "claimResolution",
  order: PHASE_ORDER_CLAIM_RESOLUTION, // After raceResolution (~65-70)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs } = context;
    const allClaims: Claim[] = state.claims ?? [];
    const raceMap = new Map(state.races.map((r: Race) => [r.id, r]));
    const horseMap = new Map(state.horses.map((h: Horse) => [h.id, h]));
    const stableMap = new Map((state.npcStables ?? []).map((s: Stable) => [s.id, s]));

    const claimsToday = allClaims.filter((c: Claim) => {
      const race = raceMap.get(c.raceId);
      return race?.resolved && race.day === newDay && race.claiming;
    });

    if (claimsToday.length === 0) return context;

    const impacts: AnyImpact[] = [];
    let privateSaleOffers = [...(state.privateSaleOffers ?? [])];
    const newLogs = [...logs];
    const newClaims: Claim[] = [...allClaims];

    // Group by (raceId, horseId)
    const grouped = new Map<string, Claim[]>();
    for (const claim of claimsToday) {
      const key = `${claim.raceId}:${claim.horseId}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(claim);
    }

    for (const [key, horseClaims] of grouped) {
      if (horseClaims.length === 0) continue;
      const [raceId, horseId] = key.split(":");

      // Deterministic random selection using raceId + horseId seed
      const seed = hashStr(raceId + horseId);
      const winnerIdx = seed % horseClaims.length;
      const winnerClaim = horseClaims[winnerIdx];

      const horse = horseMap.get(horseId);
      if (!horse) continue;

      const race = raceMap.get(raceId);
      if (!race) continue;

      const price = winnerClaim.price;
      const proceeds = netProceeds(price);

      // Transfer horse
      const originalStableId = horse.stableId;
      const originalOwnerIsPlayer = !originalStableId;

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "claimResolution",
        logLevel: "always",
        type: "horse_transfer",
        horseId,
        fromStableId: originalStableId,
        toStableId: winnerClaim.claimantStableId,
        price,
        reason: `Claiming race resolution for ${race.name}`,
      } as AnyImpact);

      // Cash flows
      if (winnerClaim.claimantStableId) {
        // NPC wins the claim — debit NPC cash
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "claimResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: winnerClaim.claimantStableId,
          amount: -price,
          reason: `Claim purchase of ${horse.name}`,
        } as AnyImpact);
      } else {
        // Player wins the claim — debit player cash
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "claimResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: "player",
          amount: -price,
          reason: `Claim purchase of ${horse.name}`,
        } as AnyImpact);
      }

      // Credit original owner
      if (originalOwnerIsPlayer) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "claimResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: "player",
          amount: proceeds,
          reason: `Claim proceeds for ${horse.name}`,
        } as AnyImpact);
        newLogs.push({
          day: newDay,
          text: `${horse.name} was claimed by ${winnerClaim.claimantStableId ? (stableMap.get(winnerClaim.claimantStableId)?.name ?? "an NPC") : "your stable"} for ${formatCurrency(price)} after ${race.name}. Net proceeds: ${formatCurrency(proceeds)}.`,
        });
      } else {
        // Credit NPC consignor
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "claimResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: originalStableId,
          amount: proceeds,
          reason: `Claim proceeds for ${horse.name}`,
        } as AnyImpact);
      }

      // If player won: log it
      if (!winnerClaim.claimantStableId) {
        newLogs.push({
          day: newDay,
          text: `Your claim on ${horse.name} was successful. They join your stable for ${formatCurrency(price)}.`,
        });
      }

      // Log player losing claim (if they had one but weren't the winner)
      const playerClaim = horseClaims.find((c: Claim) => !c.claimantStableId);
      if (playerClaim && playerClaim.id !== winnerClaim.id) {
        const loserCount = horseClaims.length - 1;
        newLogs.push({
          day: newDay,
          text: `Your claim on ${horse.name} was not drawn (${loserCount + 1} stables filed claims). No charge.`,
        });
      }

      // Remove settled claims from state (keep unresolved claims)
      const settledIds = new Set(horseClaims.map((c: Claim) => c.id));
      for (const id of settledIds) {
        const idx = newClaims.findIndex((c: Claim) => c.id === id);
        if (idx !== -1) newClaims.splice(idx, 1);
      }

      // Void any pending private sale offers on claimed horses (per spec)
      privateSaleOffers = privateSaleOffers.map((o) =>
        o.horseId === horseId && (o.status === "pending" || o.status === "countered")
          ? { ...o, status: "declined" as const }
          : o,
      );
    }

    return {
      ...context,
      state: {
        ...context.state,
        claims: newClaims,
        privateSaleOffers,
      },
      impacts: [...context.impacts, ...impacts],
      logs: newLogs,
    };
  },
};
