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
import type { FacilityType } from "@/core/facilities";
import type { Outpost } from "@/core/facilities/outpostTypes";
import type { FacilityUpgradeImpact, StaffImpact, TransportImpact, OutpostImpact } from "../impacts/miscImpacts";

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
    const { facilityId, nextLevel } = impact as FacilityUpgradeImpact;
    const facility =
      lookupMaps?.facilityMap.get(facilityId) ||
      (draft.facilities ? draft.facilities[facilityId as FacilityType] : undefined);
    if (facility) {
      facility.level = nextLevel;
    }
  },

  staff: (draft, impact, lookupMaps) => {
    const { action, staffId, salary, stableId } = impact as StaffImpact;
    if (!draft.hiredStaff) draft.hiredStaff = [];

    if (action === "hire") {
      const poolIndex = draft.staffPool.findIndex((s: any) => s.id === staffId);
      if (poolIndex !== -1) {
        const staff = draft.staffPool[poolIndex];
        staff.stableId = stableId ?? "";
        staff.salary = salary;
        draft.hiredStaff.push(staff);
        draft.staffPool.splice(poolIndex, 1);
        if (lookupMaps) lookupMaps.staffMap.set(staffId, staff);
        if (stableId === "" || stableId === undefined) {
          draft.cash -= salary;
        }
      }
    } else if (action === "fire") {
      const index = draft.hiredStaff.findIndex((s: any) => s.id === staffId);
      if (index !== -1) {
        draft.hiredStaff.splice(index, 1);
        if (lookupMaps) lookupMaps.staffMap.delete(staffId);
      }
    }
  },

  transport_horse: (draft, impact, lookupMaps) => {
    const { horseId, toOutpostId, fatigueSpike, acclimatizationDays } = impact as TransportImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.outpostId = toOutpostId;
      horse.fatigue = (horse.fatigue ?? 0) + fatigueSpike;

      // Add to outpost acclimatization list
      const stableId = horse.stableId || "player";
      let outpost: any;
      if (stableId === "player") {
        outpost = draft.outposts?.find((o) => o.id === toOutpostId);
      } else {
        const stable =
          lookupMaps?.stableMap.get(stableId) || draft.npcStables.find((s) => s.id === stableId);
        outpost = stable?.outposts?.find((o: Outpost) => o.id === toOutpostId);
      }
      if (outpost) {
        if (!outpost.acclimatizationDays) outpost.acclimatizationDays = {};
        outpost.acclimatizationDays[horseId] = acclimatizationDays;
      }
    }
  },

  outpost_action: (draft, impact, lookupMaps) => {
    const { stableId, action, outpostId, metadata } = impact as OutpostImpact;
    const stable = stableId === "player" ? draft : draft.npcStables.find((s) => s.id === stableId);
    if (stable && stable.outposts) {
      const outposts = stable.outposts;
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
