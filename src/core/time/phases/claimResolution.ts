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
import { netProceeds } from "@/game/auction";
import { hashStr } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import { PHASE_ORDER_CLAIM_RESOLUTION } from "@/game/constants/gameConstants";
import { formatCurrency } from "@/lib/formatting";

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
    const claimsToday = allClaims.filter((c: Claim) => {
      const race = state.races.find((r: Race) => r.id === c.raceId);
      return race?.resolved && race.day === newDay && race.claiming;
    });

    if (claimsToday.length === 0) return context;

    let horses: Horse[] = [...state.horses];
    let npcStables: Stable[] = [...state.npcStables];
    let playerCash = state.cash;
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

      const horse = horses.find((h: Horse) => h.id === horseId);
      if (!horse) continue;

      const race = state.races.find((r: Race) => r.id === raceId);
      if (!race) continue;

      const price = winnerClaim.price;
      const proceeds = netProceeds(price);

      // Transfer horse
      const originalStableId = horse.stableId;
      const originalOwnerIsPlayer = !originalStableId;

      horses = horses.map((h: Horse) =>
        h.id === horseId
          ? {
              ...h,
              stableId: winnerClaim.claimantStableId,
              owned: !winnerClaim.claimantStableId,
            }
          : h,
      );

      // Cash flows
      if (winnerClaim.claimantStableId) {
        // NPC wins the claim — debit NPC cash
        npcStables = npcStables.map((s: Stable) =>
          s.id === winnerClaim.claimantStableId ? { ...s, cash: Math.max(0, s.cash - price) } : s,
        );
      } else {
        // Player wins the claim — debit player cash
        playerCash = Math.max(0, playerCash - price);
      }

      // Credit original owner
      if (originalOwnerIsPlayer) {
        playerCash += proceeds;
        newLogs.push({
          day: newDay,
          text: `${horse.name} was claimed by ${winnerClaim.claimantStableId ? (npcStables.find((s) => s.id === winnerClaim.claimantStableId)?.name ?? "an NPC") : "your stable"} for ${formatCurrency(price)} after ${race.name}. Net proceeds: ${formatCurrency(proceeds)}.`,
        });
      } else {
        // Credit NPC consignor
        npcStables = npcStables.map((s: Stable) =>
          s.id === originalStableId ? { ...s, cash: s.cash + proceeds } : s,
        );
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
        horses,
        npcStables,
        cash: playerCash,
        claims: newClaims,
        privateSaleOffers,
      },
      logs: newLogs,
    };
  },
};
