/**
 * phases/npcClaiming.ts - NPC claiming phase
 *
 * This file provides the NPC claiming phase where NPC stables evaluate whether
 * to file claims on horses entered in claiming races running today.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (Race, Claim, Horse, Stable), @/game/auction (calculateLotValuation), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import type { Race, Claim, Horse, Stable } from "@/game/types";
import { calculateLotValuation } from "@/game/auction";
import { generateUUID } from "@/core/uuid";

/**
 * Phase: NPC Claiming
 * NPC stables evaluate whether to file claims on horses entered in claiming races
 * that are running today. Filed just before race resolution.
 *
 * NPC claims when: race.claiming.price <= calculateLotValuation(horse, stable, 'racing_age', allHorses) * 0.85
 */
export const npcClaimingPhase = {
  name: "npcClaiming",
  order: 62, // Just before raceResolution (order ~65)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const claimingRaces: Race[] = state.races.filter(
      (r: Race) => r.claiming && !r.resolved && r.day === newDay,
    );
    if (claimingRaces.length === 0) return context;

    const newClaims: Claim[] = [...(state.claims ?? [])];
    const npcStables: Stable[] = state.npcStables;
    const allHorses: Horse[] = state.horses;
    const horseMap = new Map(allHorses.map((h) => [h.id, h]));

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

          const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses, horseMap);
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

    return {
      ...context,
      state: {
        ...state,
        claims: newClaims,
      },
    };
  },
};
