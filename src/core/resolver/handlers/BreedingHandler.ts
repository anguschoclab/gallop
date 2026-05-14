/**
 * handlers/BreedingHandler.ts - Breeding impact handler
 *
 * This file handles breeding-related impacts including pregnancy creation/update/deletion,
 * stud career updates, blue hen status, and stud fee updates.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/breedingImpacts.ts (provides impact types)
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
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  update_stud_fee: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, newFee } = impactAny;
    const horse =
      lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse && horse.stud) {
      horse.stud.standingFee = newFee;
    }
  },
  pregnancy_creation: (draft, impact) => {
    const impactAny = impact as any;
    const { pregnancy } = impactAny;
    draft.pregnancies.push(pregnancy);
  },
  pregnancy_update: (draft, impact) => {
    const impactAny = impact as any;
    const { pregnancyId, updates } = impactAny;
    const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
    if (index !== -1) {
      Object.assign(draft.pregnancies[index], updates);
    }
  },
  pregnancy_deletion: (draft, impact) => {
    const impactAny = impact as any;
    const { pregnancyId } = impactAny;
    const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
    if (index !== -1) {
      draft.pregnancies.splice(index, 1);
    }
  },
  stud_career: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, studCareer } = impactAny;
    const horse =
      lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.stud = studCareer;
    }
  },
  blue_hen_status: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, blueHenStatus } = impactAny;
    const horse =
      lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.blueHenStatus = blueHenStatus;
    }
  },
};

export class BreedingHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "pregnancy_creation",
      "pregnancy_update",
      "pregnancy_deletion",
      "stud_career",
      "blue hen_status",
      "update_stud_fee",
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
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
