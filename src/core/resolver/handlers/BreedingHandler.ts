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
import type {
  PregnancyCreationImpact,
  PregnancyUpdateImpact,
  PregnancyDeletionImpact,
  StudCareerImpact,
  MareFoalingUpdateImpact,
  UpdateStudFeeImpact,
} from "../impacts/breedingImpacts";
import type { BlueHenImpact } from "../impacts/horseImpacts";

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
    const { horseId, newFee } = impact as UpdateStudFeeImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse && horse.stud) {
      horse.stud.standingFee = newFee;
    }
  },
  pregnancy_creation: (draft, impact) => {
    const { pregnancy } = impact as PregnancyCreationImpact;
    draft.pregnancies.push(pregnancy);
  },
  pregnancy_update: (draft, impact) => {
    const { pregnancyId, updates } = impact as PregnancyUpdateImpact;
    const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
    if (index !== -1) {
      Object.assign(draft.pregnancies[index], updates);
    }
  },
  pregnancy_deletion: (draft, impact) => {
    const { pregnancyId } = impact as PregnancyDeletionImpact;
    const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
    if (index !== -1) {
      draft.pregnancies.splice(index, 1);
    }
  },
  stud_career: (draft, impact, lookupMaps) => {
    const { horseId, studCareer } = impact as StudCareerImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse) {
      horse.stud = studCareer;
    }
  },
  mare_foaling_update: (draft, impact, lookupMaps) => {
    const { horseId, lastFoaledDay, foalsProduced, blueHenStatus } =
      impact as MareFoalingUpdateImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse) {
      horse.lastFoaledDay = lastFoaledDay;
      horse.foalsProduced = foalsProduced;
      horse.blueHenStatus = blueHenStatus;
    }
  },
  blue_hen_status: (draft, impact, lookupMaps) => {
    const { horseId, blueHenStatus } = impact as BlueHenImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
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
      "mare_foaling_update",
      "blue_hen_status",
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
