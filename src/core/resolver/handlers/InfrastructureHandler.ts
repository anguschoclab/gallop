import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

export class InfrastructureHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["facility_upgrade", "staff"].includes(type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact): void {
    switch (impact.type) {
      case "facility_upgrade": {
        const { facilityId, nextLevel } = impact;
        const facility = draft.facilities.find((f) => f.id === facilityId);
        if (facility) {
          facility.level = nextLevel;
        }
        break;
      }

      case "staff": {
        const { action, staffType, staffId, salary, specialty, skill } = impact;
        if (!draft.staff) draft.staff = [];
        
        if (action === "hire") {
          draft.staff.push({
            id: staffId,
            type: staffType,
            salary,
            specialty,
            skill,
            hiredDay: impact.day
          });
        } else if (action === "fire") {
          const index = draft.staff.findIndex(s => s.id === staffId);
          if (index !== -1) {
            draft.staff.splice(index, 1);
          }
        }
        break;
      }
    }
  }
}
