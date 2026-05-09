import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import { isMaleHorse } from "@/core/horse/gender";
import type { ImpactHandler } from "./types";

export class HorseHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "horse_stat_change",
      "energy_change",
      "form_change",
      "fame_change",
      "gelding",
      "rename",
      "aging",
      "health_status_change",
      "pasture_retirement",
      "horse_death",
      "injury",
      "horse_creation"
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
    const horseId = impactAny.horseId || impactAny.entityId;
    const horse =
      lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);

    switch (impact.type) {
      case "horse_creation": {
        const { horse } = impactAny;
        if (horse) {
          draft.horses.push(horse);
          if (lookupMaps) lookupMaps.horseMap.set(horse.id, horse);
        }
        break;
      }
      case "horse_stat_change": {
        const { stat, delta } = impactAny;
        if (horse) {
          horse.stats[stat] = Math.min(horse.potential, Math.max(0, horse.stats[stat] + delta));
        }
        break;
      }

      case "energy_change": {
        const { delta } = impactAny;
        if (horse) {
          horse.energy = Math.min(100, Math.max(0, horse.energy + delta));
        }
        break;
      }

      case "form_change": {
        const { delta } = impactAny;
        if (horse) {
          horse.form = Math.min(10, Math.max(-10, horse.form + delta));
        }
        break;
      }

      case "fame_change": {
        const { delta } = impactAny;
        if (horse) {
          horse.fame = Math.min(100, Math.max(0, horse.fame + delta));
        }
        break;
      }

      case "gelding": {
        if (horse && (isMaleHorse(horse.gender))) {
          horse.gender = "gelding";
        }
        break;
      }

      case "rename": {
        const { newName } = impactAny;
        if (horse) {
          horse.name = newName;
        }
        break;
      }

      case "aging": {
        const { newAge } = impactAny;
        if (horse) {
          horse.age = newAge;
        }
        break;
      }

      case "health_status_change": {
        const { status } = impactAny;
        if (horse) {
          horse.healthStatus = status;
          horse.healthStatusDay = impact.day;
        }
        break;
      }

      case "pasture_retirement": {
        const { retiredOnDay } = impactAny;
        if (horse) {
          horse.lifecycleStatus = "retired";
          horse.retiredOnDay = retiredOnDay;
        }
        break;
      }

      case "horse_death": {
        const { cause, deceasedOnDay } = impactAny;
        if (horse) {
          horse.lifecycleStatus = "deceased";
          horse.deceasedOnDay = deceasedOnDay;
          horse.causeOfDeath = cause;
        }
        break;
      }

      case "injury": {
        const { severity, injuryType, recoveryDays } = impactAny;
        if (horse) {
          horse.healthStatus = severity === "career-ending" ? "other_illness" : "recovering";
          horse.healthStatusDay = impact.day;
          horse.activeInjury = {
            type: injuryType,
            severity,
            recoveryDays,
            onsetDay: impact.day,
          };
        }
        break;
      }
    }
  }

}
