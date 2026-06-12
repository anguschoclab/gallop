/**
 * phases/pregnancy.ts - Pregnancy resolution phase
 *
 * This file provides the pregnancy resolution phase that resolves pregnancies
 * and handles foaling events, including AI outcome recording for NPCs.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (Horse, Pregnancy), @/core/breeding/lineage (getFoalsBy), @/game/store/helpers/pregnancy (resolvePregnancies), @/core/reputation (createReputationEvent, calculateBreedingReputation, getReputationTier), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/ai/breedingAI (recordBreedingOutcome), @/core/horse/stats (calculateOverallRating)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_PREGNANCY } from "@/constants";
import type { PipelineContext } from "../pipeline";
import type { Horse, Pregnancy } from "@/game/types";
import { getFoalsBy } from "@/core/breeding/lineage";
import { resolvePregnancies } from "@/game/store/helpers/pregnancy";
import { generateUUID } from "@/core/uuid";
import {
  createReputationEvent,
  calculateBreedingReputation,
  getReputationTier,
} from "@/core/reputation";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { recordBreedingOutcome } from "@/core/ai/breedingAI";
import { calculateOverallRating } from "@/core/horse/stats";

/**
 * Phase: Pregnancy Resolution
 * Resolve pregnancies and handle foaling events
 */
export const pregnancyPhase = {
  name: "pregnancy",
  order: PHASE_ORDER_PREGNANCY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const usedNamesSet = new Set(state.usedHorseNames);
    const pregResult = resolvePregnancies(
      state.pregnancies,
      state.horses,
      state.npcStables,
      usedNamesSet,
      newDay,
      { horses: state.horses, userSettings: state.userSettings, reservedHorseNames: state.reservedHorseNames },
    );
    const { pregnancies, foals, cashAdjustment } = pregResult;

    const pregnancyByFoalId = new Map(pregnancies.map((p) => [p.foalId, p]));
    const horseMap = new Map(state.horses.map((h) => [h.id, h]));
    const stableMap = new Map((state.npcStables ?? []).map((s) => [s.id, s]));

    // Record breeding outcomes for NPC AI
    if (state.npcAIManager) {
      for (const foal of foals) {
        const pregnancy = pregnancyByFoalId.get(foal.id);
        if (pregnancy) {
          // If sire is NPC-owned, record outcome for that stable's AI
          const sire = horseMap.get(pregnancy.sireId);
          if (sire && sire.stableId) {
            const stable = stableMap.get(sire.stableId);
            if (stable) {
              const stableAI = getOrCreateStableAIState(state.npcAIManager, stable, newDay);
              if (stableAI.breedingAI) {
                const foalRating = calculateOverallRating(foal);
                stableAI.breedingAI = recordBreedingOutcome(
                  stableAI.breedingAI,
                  pregnancy.sireId,
                  pregnancy.damId,
                  foal.id,
                  foalRating,
                  true, // Successful foaling
                  newDay,
                );
                state.npcAIManager.stableStates[stable.id] = stableAI;
              }
            }
          }
        }
      }
    }

    // Add reputation events for player-owned foals born
    const newReputationEvents = state.reputation?.events ?? [];
    const newInboxMessages = [...(state.inbox ?? [])];

    for (const foal of foals) {
      // Find the pregnancy that produced this foal
      const pregnancy = pregnancyByFoalId.get(foal.id);
      if (pregnancy) {
        const dam = horseMap.get(pregnancy.damId);
        // Only add reputation/inbox for player-owned dams
        if (dam && !dam.stableId) {
          const foalQuality = foal.potential;
          const reputationAmount = calculateBreedingReputation(foalQuality);
          const reputationEvent = createReputationEvent(
            "breeding_success",
            reputationAmount,
            `Foal born: ${foal.name} (potential ${foalQuality})`,
            newDay,
            { horseId: foal.id },
          );
          newReputationEvents.push(reputationEvent);

          // Push to Inbox
          newInboxMessages.push({
            id: generateUUID(),
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
          });
        }
      }
    }

    return {
      ...context,
      state: {
        ...state,
        horses: [...state.horses, ...foals],
        pregnancies,
        cash: state.cash + cashAdjustment,
        usedHorseNames: Array.from(usedNamesSet),
        inbox: newInboxMessages,
        reputation: state.reputation
          ? {
              ...state.reputation,
              events: newReputationEvents,
              score:
                state.reputation.score + newReputationEvents.reduce((sum, e) => sum + e.amount, 0),
              tier: getReputationTier(
                state.reputation.score + newReputationEvents.reduce((sum, e) => sum + e.amount, 0),
              ),
            }
          : state.reputation,
      },
      logs: [...context.logs, ...pregResult.logs],
    };
  },
};
