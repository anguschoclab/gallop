/**
 * phases/npcClaiming.ts - NPC claiming phase
 *
 * This file provides the NPC claiming phase where NPC stables evaluate whether
 * to file claims on horses entered in claiming races running today.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (Race, Claim, Horse, Stable), @/game/auction (calculateLotValuation), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_NPC_CLAIMING } from "@/constants";
import type { PipelineContext } from "../pipeline";
import type { Race, Claim, Horse, Stable } from "@/game/types";
import { calculateLotValuation } from "@/core/auction/engine";
import { generateUUID } from "@/core/uuid";
import { trackClaimingActivity } from "@/core/ai/economyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

/**
 * Phase: NPC Claiming
 * NPC stables evaluate whether to file claims on horses entered in claiming races
 * that are running today. Filed just before race resolution.
 *
 * NPC claims when: race.claiming.price <= calculateLotValuation(horse, stable, 'racing_age', allHorses) * 0.85
 */
export const npcClaimingPhase = {
  name: "npcClaiming",
  order: PHASE_ORDER_NPC_CLAIMING, // Just before raceResolution (order ~65)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const claimingRaces: Race[] = Object.values(state.races).filter(
      (r: Race) => r.claiming && !r.resolved && r.day === newDay,
    );
    if (claimingRaces.length === 0) return context;

    const newClaims: Claim[] = [...(state.claims ?? [])];
    const npcStables: Stable[] = state.npcStables;
    const horseMap = context.horseMap;

    for (const race of claimingRaces) {
      const price = race.claiming!.price;
      for (const entry of race.entries) {
        // Only file claims on horses the NPC doesn't already own
        const horse = horseMap.get(entry.horseId);
        if (!horse) continue;

        for (const stable of npcStables) {
          // Don't claim own horses
          if (horse.stableId === stable.id) continue;
          // Don't duplicate claims
          const alreadyClaimed = newClaims.some(
            (c: Claim) =>
              c.raceId === race.id &&
              c.horseId === entry.horseId &&
              c.claimantStableId === stable.id,
          );
          if (alreadyClaimed) continue;

          const valuation = calculateLotValuation(
            horse,
            stable,
            "racing_age",
            Object.values(state.horses),
            horseMap,
          );
          if (price <= valuation * 0.85 && stable.cash >= price) {
            newClaims.push({
              id: generateUUID(),
              raceId: race.id,
              horseId: entry.horseId,
              claimantStableId: stable.id,
              price,
              day: newDay,
            });
          }
        }
      }
    }

    // Track claiming volume for economic signals (Phase 5b)
    const newClaimCount = newClaims.length - (state.claims?.length ?? 0);
    let updatedNpcAIManager = state.npcAIManager;
    if (newClaimCount > 0 && updatedNpcAIManager) {
      updatedNpcAIManager = trackClaimingActivity(
        updatedNpcAIManager as NpcAIManager,
        newClaimCount,
      );
    }

    return {
      ...context,
      state: {
        ...state,
        claims: newClaims,
        ...(updatedNpcAIManager ? { npcAIManager: updatedNpcAIManager } : {}),
      },
    };
  },
};
