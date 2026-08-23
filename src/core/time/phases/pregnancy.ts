/**
 * phases/pregnancy.ts - Pregnancy resolution phase
 *
 * This file provides the pregnancy resolution phase that resolves pregnancies
 * and produces impacts for foaling events, NPC AI learning, and player reputation.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (Horse, Pregnancy), @/game/store/helpers/pregnancy (PregnancyResult, resolvePregnancies), @/core/resolver/impacts (AnyImpact, CashImpact, HorseCreationImpact, InboxImpact, ReputationImpact, MareFoalingUpdateImpact, StudCareerImpact), @/core/reputation (createReputationEvent, calculateBreedingReputation), @/core/ai/npcCycleAI (NpcAIManager, getOrCreateStableAIState), @/core/ai/breedingAI (recordBreedingOutcome), @/core/horse/stats (calculateOverallRating), @/core/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase), @/core/resolver/handlers/* (applies impacts)
 */

import { PHASE_ORDER_PREGNANCY } from "@/constants";
import type { PipelineContext } from "../pipeline";
import type { Horse, Pregnancy, Stable } from "@/game/types";
import { type PregnancyResult, resolvePregnancies } from "@/game/store/helpers/pregnancy";
import type {
  AnyImpact,
  CashImpact,
  HorseCreationImpact,
  InboxImpact,
  ReputationImpact,
  MareFoalingUpdateImpact,
  StudCareerImpact,
} from "@/core/resolver/impacts";
import type { PregnancyCheckIntent, PregnancyResolutionIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/core/uuid";
import { createReputationEvent, calculateBreedingReputation } from "@/core/reputation";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { recordBreedingOutcome } from "@/core/ai/breedingRecording";
import { calculateOverallRating } from "@/core/horse/stats";

/**
 * Build the updated NPC AI manager from foaling outcomes.
 * Returns undefined when no manager is present.
 *
 * @param foals - Newly born foals
 * @param pregnancies - Resolved pregnancy records
 * @param horses - All horses for parent lookups
 * @param stables - NPC stables for AI state lookups
 * @param npcAIManager - Current NPC AI manager, if any
 * @param newDay - Current simulation day
 * @internal
 */
export function buildNpcAIManagerUpdate(
  foals: Horse[],
  pregnancies: Pregnancy[],
  horses: Horse[],
  stables: Stable[],
  npcAIManager: NpcAIManager | undefined,
  newDay: number,
): NpcAIManager | undefined {
  if (!npcAIManager) return undefined;

  const pregnancyByFoalId = new Map(pregnancies.map((p) => [p.foalId, p]));
  const horseMap = new Map(horses.map((h) => [h.id, h]));
  const stableMap = new Map(stables.map((s) => [s.id, s]));

  const nextManager: NpcAIManager = {
    ...npcAIManager,
    stableStates: Object.fromEntries(
      Object.entries(npcAIManager.stableStates).map(([id, s]) => [id, { ...s }]),
    ),
  };

  for (const foal of foals) {
    const pregnancy = pregnancyByFoalId.get(foal.id);
    if (!pregnancy) continue;

    const sire = horseMap.get(pregnancy.sireId);
    if (!sire || sire.ownership?.type !== "npc") continue;

    const stable = stableMap.get(sire.ownership.stableId);
    if (!stable) continue;

    const stableAI = getOrCreateStableAIState(nextManager, stable, newDay);
    if (!stableAI.breedingAI) continue;

    const foalRating = calculateOverallRating(foal);
    stableAI.breedingAI = recordBreedingOutcome(
      stableAI.breedingAI,
      pregnancy.sireId,
      pregnancy.damId,
      foal.id,
      foalRating,
      true,
      newDay,
    );
    nextManager.stableStates[stable.id] = stableAI;
  }

  return nextManager;
}

/**
 * Build impacts for foals produced by pregnancy resolution.
 * Emits horse_creation, reputation_change, inbox_message, and cash_change impacts.
 *
 * @param foals - Newly born foals
 * @param pregnancies - Resolved pregnancy records
 * @param horses - All horses for parent lookups
 * @param newDay - Current simulation day
 * @param cashAdjustment - Refund amount to emit as cash_change, if positive
 * @internal
 */
export function buildPregnancyImpacts(
  foals: Horse[],
  pregnancies: Pregnancy[],
  horses: Horse[],
  newDay: number,
  cashAdjustment: number,
): AnyImpact[] {
  const pregnancyByFoalId = new Map(pregnancies.map((p) => [p.foalId, p]));
  const horseMap = new Map(horses.map((h) => [h.id, h]));
  const impacts: AnyImpact[] = [];

  for (const foal of foals) {
    const pregnancy = pregnancyByFoalId.get(foal.id);
    if (!pregnancy) continue;

    const horseCreation: HorseCreationImpact = {
      id: generateUUID(),
      intentId: "",
      day: newDay,
      phase: "pregnancy",
      logLevel: "conditional",
      type: "horse_creation",
      horse: foal,
      reason: `Foal born: ${foal.name} (by ${pregnancy.sireName} out of ${pregnancy.damName})`,
    };
    impacts.push(horseCreation);

    const dam = horseMap.get(pregnancy.damId);
    if (dam && dam.ownership?.type !== "npc") {
      const foalQuality = foal.potential;
      const reputationAmount = calculateBreedingReputation(foalQuality);

      const reputationImpact: ReputationImpact = {
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "pregnancy",
        logLevel: "always",
        type: "reputation_change",
        delta: reputationAmount,
        source: "breeding_success",
        reason: `Foal born: ${foal.name} (potential ${foalQuality})`,
        metadata: { horseId: foal.id },
      };
      impacts.push(reputationImpact);

      const inboxImpact: InboxImpact = {
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "pregnancy",
        logLevel: "conditional",
        type: "inbox_message",
        message: {
          day: newDay,
          category: "foaling",
          priority: "info",
          title: `New Arrival: ${foal.name}`,
          body: `A healthy ${foal.gender === "filly" ? "filly" : "colt"} by ${
            horseMap.get(pregnancy.sireId)?.name || "Unknown"
          } out of ${dam.name} was born today.`,
          cta: {
            label: "View Foal",
            route: "stable.$horseId",
            params: { horseId: foal.id },
          },
        },
      };
      impacts.push(inboxImpact);
    }
  }

  if (cashAdjustment > 0) {
    const cashImpact: CashImpact = {
      id: generateUUID(),
      intentId: "",
      day: newDay,
      phase: "pregnancy",
      logLevel: "conditional",
      type: "cash_change",
      entityId: "player",
      amount: cashAdjustment,
      reason: "Live Foal Guarantee refund",
    };
    impacts.push(cashImpact);
  }

  return impacts;
}

function buildMareFoalingImpacts(
  mareFoalingUpdates: PregnancyResult["mareFoalingUpdates"],
  newDay: number,
): MareFoalingUpdateImpact[] {
  return mareFoalingUpdates.map((update) => ({
    id: generateUUID(),
    intentId: "",
    day: newDay,
    phase: "pregnancy",
    logLevel: "conditional",
    type: "mare_foaling_update",
    horseId: update.horseId,
    lastFoaledDay: update.lastFoaledDay,
    foalsProduced: update.foalsProduced,
    blueHenStatus: update.blueHenStatus,
    reason: `Dam ${update.horseId} foaled`,
  }));
}

function buildStudCareerImpacts(
  studCareerUpdates: PregnancyResult["studCareerUpdates"],
  newDay: number,
): StudCareerImpact[] {
  return studCareerUpdates.map((update) => ({
    id: generateUUID(),
    intentId: "",
    day: newDay,
    phase: "pregnancy",
    logLevel: "conditional",
    type: "stud_career",
    horseId: update.horseId,
    studCareer: update.studCareer,
    reason: `Sire ${update.horseId} recorded a new foal`,
  }));
}

/**
 * Phase: Pregnancy Resolution
 * Resolve pregnancies and produce impacts for the impact resolver.
 * This phase handles "pregnancy_check" and "pregnancy_resolution" intent types
 * by directly resolving all pregnancies in state (not via intent queue).
 */
export const pregnancyPhase = {
  name: "pregnancy",
  order: PHASE_ORDER_PREGNANCY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const usedNamesSet = new Set(state.usedHorseNames);

    const horsesArray = Object.values(state.horses);
    const pregResult = resolvePregnancies(
      state.pregnancies,
      horsesArray,
      state.npcStables,
      usedNamesSet,
      newDay,
      state,
    );

    const updatedNpcAIManager = buildNpcAIManagerUpdate(
      pregResult.foals,
      pregResult.pregnancies,
      horsesArray,
      state.npcStables,
      state.npcAIManager,
      newDay,
    );

    const impacts = [
      ...buildPregnancyImpacts(
        pregResult.foals,
        pregResult.pregnancies,
        horsesArray,
        newDay,
        pregResult.cashAdjustment,
      ),
      ...buildMareFoalingImpacts(pregResult.mareFoalingUpdates, newDay),
      ...buildStudCareerImpacts(pregResult.studCareerUpdates, newDay),
    ];

    return {
      ...context,
      state: {
        ...state,
        pregnancies: pregResult.pregnancies,
        usedHorseNames: Array.from(pregResult.usedNames),
        npcAIManager: updatedNpcAIManager,
      },
      logs: [...context.logs, ...pregResult.logs],
      impacts: [...context.impacts, ...impacts],
    };
  },
};
