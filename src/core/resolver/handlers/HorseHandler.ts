/**
 * handlers/HorseHandler.ts - Horse impact handler
 *
 * This file handles horse-related impacts including stat changes, energy changes,
 * form changes, fame changes, gelding, renaming, aging, health status changes,
 * pasture retirement, horse death, injury, and horse creation.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), @/core/horse/gender (isMaleHorse), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/horseImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import { isMaleHorse } from "@/core/horse/gender";
import type { ImpactHandler } from "./types";
import { generateUUID } from "@/core/uuid";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  horse: WritableDraft<any> | undefined,
  lookupMaps?: {
    horseMap: Map<string, WritableDraft<any>>;
    stableMap: Map<string, WritableDraft<any>>;
    campaignMap: Map<string, WritableDraft<any>>;
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  horse_creation: (draft, impact, horse, lookupMaps) => {
    const impactAny = impact as any;
    const { horse: horseData } = impactAny;
    if (horseData) {
      draft.horses.push(horseData);
      if (lookupMaps) lookupMaps.horseMap.set(horseData.id, horseData);
    }
  },
  horse_stat_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { stat, delta } = impactAny;
    if (horse) {
      horse.stats[stat] = Math.min(horse.potential, Math.max(0, horse.stats[stat] + delta));
    }
  },
  energy_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { delta } = impactAny;
    if (horse) {
      horse.energy = Math.min(100, Math.max(0, horse.energy + delta));
    }
  },
  form_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { delta } = impactAny;
    if (horse) {
      horse.form = Math.min(10, Math.max(-10, horse.form + delta));
    }
  },
  fame_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { delta } = impactAny;
    if (horse) {
      horse.fame = Math.min(100, Math.max(0, horse.fame + delta));
    }
  },
  gelding: (draft, impact, horse) => {
    if (horse && isMaleHorse(horse.gender)) {
      horse.gender = "gelding";
    }
  },
  rename: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { newName } = impactAny;
    if (horse) {
      horse.name = newName;
    }
  },
  aging: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { newAge } = impactAny;
    if (horse) {
      horse.age = newAge;
    }
  },
  health_status_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { status } = impactAny;
    if (horse) {
      horse.healthStatus = status;
      horse.healthStatusDay = impact.day;
    }
  },
  pasture_retirement: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { retiredOnDay } = impactAny;
    if (horse) {
      horse.lifecycleStatus = "retired";
      horse.retiredOnDay = retiredOnDay;
    }
  },
  horse_death: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { cause, deceasedOnDay } = impactAny;
    if (horse) {
      horse.lifecycleStatus = "deceased";
      horse.deceasedOnDay = deceasedOnDay;
      horse.causeOfDeath = cause;
    }
  },
  injury: (draft, impact, horse) => {
    const impactAny = impact as any;
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

      // Push to Inbox if player-owned
      if (!horse.stableId) {
        if (!draft.inbox) draft.inbox = [];
        draft.inbox.push({
          id: generateUUID(),
          day: impact.day,
          category: "injury",
          priority: "urgent",
          title: `Injury: ${horse.name}`,
          body: `${horse.name} sustained a ${severity} ${injuryType} injury. Estimated recovery: ${recoveryDays} days.`,
          cta: {
            label: "View Horse",
            route: "stable.$horseId",
            params: { horseId: horse.id },
          },
        });
      }
    }
  },
  recovery_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { delta } = impactAny;
    if (horse) {
      horse.recoveryPoints = Math.min(100, Math.max(0, (horse.recoveryPoints ?? 100) + delta));
    }
  },
  fitness_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { delta } = impactAny;
    if (horse) {
      horse.fitness = Math.max(0, (horse.fitness ?? 0) + delta);
    }
  },
  fatigue_change: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { delta } = impactAny;
    if (horse) {
      horse.fatigue = Math.max(0, (horse.fatigue ?? 0) + delta);
    }
  },
  peaking_index_update: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { value } = impactAny;
    if (horse) {
      horse.peakingIndex = value;
    }
  },
  beyer_update: (draft, impact, horse) => {
    const impactAny = impact as any;
    const { beyer, raceDay } = impactAny;
    if (horse) {
      horse.lastBeyer = beyer;
      horse.lastRaceDay = raceDay;
    }
  },
};

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
      "horse_creation",
      "recovery_change",
      "fitness_change",
      "fatigue_change",
      "peaking_index_update",
      "beyer_update",
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
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);

    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, horse, lookupMaps);
    }
  }
}
