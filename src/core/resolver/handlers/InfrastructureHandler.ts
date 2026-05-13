/**
 * handlers/InfrastructureHandler.ts - Infrastructure impact handler
 *
 * This file handles infrastructure-related impacts including facility upgrades,
 * staff management, horse transport, and outpost actions.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/miscImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: {
    horseMap: Map<string, WritableDraft<any>>;
    stableMap: Map<string, WritableDraft<any>>;
    campaignMap: Map<string, WritableDraft<any>>;
    raceMap: Map<string, WritableDraft<any>>;
    jockeyMap: Map<string, WritableDraft<any>>;
    auctionMap: Map<string, WritableDraft<any>>;
    facilityMap: Map<string, WritableDraft<any>>;
    staffMap: Map<string, WritableDraft<any>>;
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  facility_upgrade: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { facilityId, nextLevel } = impactAny;
    const facility =
      lookupMaps?.facilityMap.get(facilityId) ||
      draft.facilities.find((f) => f.id === facilityId);
    if (facility) {
      facility.level = nextLevel;
    }
  },

  staff: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const {
      action,
      staffType,
      staffId,
      salary,
      specialty,
      skill,
      name,
      tier,
      bonusValue,
      traits,
      fame,
    } = impactAny;
    if (!draft.hiredStaff) draft.hiredStaff = [];

    if (action === "hire") {
      const newStaff = {
        id: staffId,
        name: name || "New Staff",
        role: staffType,
        tier: tier || "standard",
        salary,
        bonusValue: bonusValue || 0,
        traits: traits || [],
        fame: fame || 0,
        stableId: impactAny.stableId,
        contractUntil: impactAny.contractUntil,
      };
      draft.hiredStaff.push(newStaff);
      if (lookupMaps) lookupMaps.staffMap.set(staffId, newStaff);
    } else if (action === "fire") {
      const index = draft.hiredStaff.findIndex((s) => s.id === staffId);
      if (index !== -1) {
        draft.hiredStaff.splice(index, 1);
        if (lookupMaps) lookupMaps.staffMap.delete(staffId);
      }
    }
  },

  transport_horse: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, toOutpostId, fatigueSpike, acclimatizationDays } = impactAny;
    const horse =
      lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.outpostId = toOutpostId;
      horse.fatigue = (horse.fatigue ?? 0) + fatigueSpike;

      // Add to outpost acclimatization list
      const stableId = horse.stableId || "player";
      const stable =
        lookupMaps?.stableMap.get(stableId) || draft.npcStables.find((s) => s.id === stableId);
      if (stable && stable.outposts) {
        const outpost = stable.outposts.find((o: any) => o.id === toOutpostId);
        if (outpost) {
          if (!outpost.acclimatizationDays) outpost.acclimatizationDays = {};
          outpost.acclimatizationDays[horseId] = acclimatizationDays;
        }
      }
    }
  },

  outpost_action: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { stableId, action, outpostId, metadata } = impactAny;
    const stable =
      stableId === "player" ? draft : draft.npcStables.find((s) => s.id === stableId);
    if (stable && (stable as any).outposts) {
      const outposts = (stable as any)
        .outposts as import("@/core/facilities/outpostTypes").Outpost[];
      if (action === "create") {
        outposts.push({
          id: outpostId,
          name: metadata?.name || "New Outpost",
          region: metadata?.region || "North America (East)",
          totalSlots: 12,
          facilities: {},
          acclimatizationDays: {},
          headTrainerId: metadata?.headTrainerId,
        });
      } else if (action === "assign_trainer") {
        const outpost = outposts.find((o) => o.id === outpostId);
        if (outpost) outpost.headTrainerId = metadata?.trainerId;
      }
    }
  },
};

export class InfrastructureHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["facility_upgrade", "staff", "transport_horse", "outpost_action"].includes(type);
  }

  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
      raceMap: Map<string, WritableDraft<any>>;
      jockeyMap: Map<string, WritableDraft<any>>;
      auctionMap: Map<string, WritableDraft<any>>;
      facilityMap: Map<string, WritableDraft<any>>;
      staffMap: Map<string, WritableDraft<any>>;
    },
  ): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
