import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

export class InfrastructureHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["facility_upgrade", "staff"].includes(type);
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
    const impactAny = impact as any;

    switch (impact.type) {
      case "facility_upgrade": {
        const { facilityId, nextLevel } = impactAny;
        const facility = lookupMaps?.facilityMap.get(facilityId) || draft.facilities.find((f) => f.id === facilityId);
        if (facility) {
          facility.level = nextLevel;
        }
        break;
      }

      case "staff": {
        const { action, staffType, staffId, salary, specialty, skill, name, tier, bonusValue, traits, fame } = impactAny;
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
            contractUntil: impactAny.contractUntil
          };
          draft.hiredStaff.push(newStaff);
          if (lookupMaps) lookupMaps.staffMap.set(staffId, newStaff);
        } else if (action === "fire") {
          const index = draft.hiredStaff.findIndex(s => s.id === staffId);
          if (index !== -1) {
            draft.hiredStaff.splice(index, 1);
            if (lookupMaps) lookupMaps.staffMap.delete(staffId);
          }
        }
        break;
      }

    }
  }

}
