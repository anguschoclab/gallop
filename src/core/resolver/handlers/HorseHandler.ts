import type { WritableDraft } from "immer/dist/internal";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
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
      "horse_death"
    ].includes(type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact): void {
    switch (impact.type) {
      case "horse_stat_change": {
        const { horseId, stat, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stats[stat] = Math.min(horse.potential, Math.max(0, horse.stats[stat] + delta));
        }
        break;
      }

      case "energy_change": {
        const { horseId, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.energy = Math.min(100, Math.max(0, horse.energy + delta));
        }
        break;
      }

      case "form_change": {
        const { horseId, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.form = Math.min(10, Math.max(-10, horse.form + delta));
        }
        break;
      }

      case "fame_change": {
        const { horseId, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.fame = Math.min(100, Math.max(0, horse.fame + delta));
        }
        break;
      }

      case "gelding": {
        const { horseId } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse && (horse.gender === "colt" || horse.gender === "horse")) {
          horse.gender = "gelding";
        }
        break;
      }

      case "rename": {
        const { horseId, newName } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.name = newName;
        }
        break;
      }

      case "aging": {
        const { horseId, newAge } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.age = newAge;
        }
        break;
      }

      case "health_status_change": {
        const { horseId, status } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.healthStatus = status;
          horse.healthStatusDay = impact.day;
        }
        break;
      }

      case "pasture_retirement": {
        const { horseId, retiredOnDay } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.lifecycleStatus = "retired";
          horse.retiredOnDay = retiredOnDay;
        }
        break;
      }

      case "horse_death": {
        const { horseId, cause, deceasedOnDay } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.lifecycleStatus = "deceased";
          horse.deceasedOnDay = deceasedOnDay;
          horse.causeOfDeath = cause;
        }
        break;
      }
    }
  }
}
