import type { PipelineContext } from "../pipeline";
import type { Horse, Pregnancy } from "@/game/types";
import { getFoalsBy } from "@/core/breeding/lineage";
import { resolvePregnancies } from "@/game/store/helpers/pregnancy";
import { createReputationEvent, calculateBreedingReputation, getReputationTier } from "@/core/reputation";

/**
 * Phase: Pregnancy Resolution
 * Resolve pregnancies and handle foaling events
 */
export const pregnancyPhase = {
  name: "pregnancy",
  order: 70,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const usedNamesSet = new Set(state.usedHorseNames);
    const pregResult = resolvePregnancies(
      state.pregnancies,
      state.horses,
      state.npcStables,
      usedNamesSet,
      newDay
    );
    const { pregnancies, foals, cashAdjustment } = pregResult;

    // Add reputation events for player-owned foals born
    const newReputationEvents = state.reputation?.events ?? [];
    for (const foal of foals) {
      // Find the pregnancy that produced this foal
      const pregnancy = pregnancies.find((p) => p.foalId === foal.id);
      if (pregnancy) {
        const dam = state.horses.find((h) => h.id === pregnancy.damId);
        // Only add reputation for player-owned dams
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
        reputation: state.reputation
          ? {
              ...state.reputation,
              events: newReputationEvents,
              score:
                state.reputation.score + newReputationEvents.reduce((sum, e) => sum + e.amount, 0),
              tier: getReputationTier(
                state.reputation.score +
                  newReputationEvents.reduce((sum, e) => sum + e.amount, 0),
              ),
            }
          : state.reputation,
      },
      logs: [...context.logs, ...pregResult.logs],
    };
  },
};
