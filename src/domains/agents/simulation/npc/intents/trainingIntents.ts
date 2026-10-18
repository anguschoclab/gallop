import type { TrainingIntent } from "@/core/resolver/intents";
import type { GameState, Horse, Stable } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { getAvailableTrainingTypes } from "@/core/facilities";
import {
  createTrainingAIState,
  selectTrainingType,
  shouldTrainToday,
} from "@/domains/agents/simulation/trainingAI";
import type { StableAIState, DifficultyState } from "@/domains/agents/simulation/npcCycleAI";
import type { DistressLevel } from "@/domains/agents/simulation/financialDistressAI";
import { TRAINING_CAUTION_MIN_ENERGY } from "@/constants/financialDistressConstants";
import { TRAINING_COST, TRAINING_COST_MAP } from "@/constants";

export function generateNpcTrainingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  activePregnanciesByDam: Set<string>,
  trainingWeight = 1.0,
  distressLevel: DistressLevel = "healthy",
  difficultyModulator?: DifficultyState,
): TrainingIntent[] {
  const intents: TrainingIntent[] = [];

  if (distressLevel === "critical") return intents;

  const trainingAI = stableAI?.trainingAI ?? createTrainingAIState(stable);

  const trainingBudget = stableAI?.budgetAllocation?.training;
  let cumulativeTrainingSpend = 0;

  const stableFacilities = state.npcFacilities?.[stable.id];
  const availableTypes = stableFacilities
    ? getAvailableTrainingTypes(stableFacilities)
    : ["speed", "stamina", "acceleration", "rest"];

  for (const horse of ownedHorses) {
    const minEnergy = distressLevel === "healthy" ? 15 : TRAINING_CAUTION_MIN_ENERGY;
    if (horse.energy >= minEnergy && !activePregnanciesByDam.has(horse.id)) {
      if (distressLevel === "emergency") {
        if (!shouldTrainToday(trainingAI, horse, day, trainingWeight)) continue;
        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50,
          type: "training",
          horseId: horse.id,
          trainingType: "rest",
        });
        continue;
      }

      const effectiveTrainingWeight = difficultyModulator
        ? trainingWeight * difficultyModulator.npcCompetenceMultiplier
        : trainingWeight;
      if (shouldTrainToday(trainingAI, horse, day, effectiveTrainingWeight)) {
        const trainingType = selectTrainingType(trainingAI, horse, day, availableTypes);
        const trainingCost = TRAINING_COST_MAP[trainingType] ?? TRAINING_COST;

        if (
          trainingBudget !== undefined &&
          cumulativeTrainingSpend + trainingCost > trainingBudget
        ) {
          continue;
        }
        cumulativeTrainingSpend += trainingCost;

        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50,
          type: "training",
          horseId: horse.id,
          trainingType,
        });
      }
    }
  }

  return intents;
}
