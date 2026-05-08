import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

export class BreedingHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "pregnancy_creation",
      "pregnancy_update",
      "pregnancy_deletion",
      "stud_career",
      "blue hen_status",
      "update_stud_fee"
    ].includes(type);
  }

  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
    },
  ): void {
    const impactAny = impact as any;

    switch (impact.type) {
      case "update_stud_fee": {
        const { horseId, newFee } = impactAny;
        const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
        if (horse && horse.stud) {
          horse.stud.standingFee = newFee;
        }
        break;
      }
      case "pregnancy_creation": {
        const { pregnancy } = impactAny;
        draft.pregnancies.push(pregnancy);
        break;
      }

      case "pregnancy_update": {
        const { pregnancyId, updates } = impactAny;
        const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
        if (index !== -1) {
          Object.assign(draft.pregnancies[index], updates);
        }
        break;
      }

      case "pregnancy_deletion": {
        const { pregnancyId } = impactAny;
        const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
        if (index !== -1) {
          draft.pregnancies.splice(index, 1);
        }
        break;
      }

      case "stud_career": {
        const { horseId, studCareer } = impactAny;
        const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stud = studCareer;
        }
        break;
      }

      case "blue hen_status": {
        const { horseId, blueHenStatus } = impactAny;
        const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.blueHenStatus = blueHenStatus;
        }
        break;
      }
    }
  }

}
