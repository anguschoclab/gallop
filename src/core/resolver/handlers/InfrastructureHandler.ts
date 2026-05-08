import type { WritableDraft } from "immer/dist/internal";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

export class InfrastructureHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["facility_upgrade", "tactics", "staff"].includes(type);
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

      case "tactics": {
        const { raceId, horseId, tactics } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          const entry = race.entries.find((e) => e.horseId === horseId);
          if (entry) {
            // Add tactics to entry if not already there (extending the type)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (entry as any).tactics = tactics;
          }
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
