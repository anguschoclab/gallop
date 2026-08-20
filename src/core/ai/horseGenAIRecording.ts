import type { Horse, Stable } from "@/game/types";
import type { HorseGenAIState, HorseGeneration } from "./horseGenAI";
import { calculateOverallRating } from "@/core/horse/stats";
import { recordPersonalityOutcome } from "./personalitySystem";
import { recordLearningOutcome } from "./learningModule";

export function updateRosterComposition(aiState: HorseGenAIState, horse: Horse): HorseGenAIState {
  const composition = aiState.rosterComposition;

  const newAgeDistribution = {
    ...composition.currentAgeDistribution,
    [horse.age]: (composition.currentAgeDistribution[horse.age] || 0) + 1,
  };

  const newCount = composition.currentHorseCount + 1;

  const horseRating = calculateOverallRating(horse);
  const totalQuality = composition.currentQualityLevel * (newCount - 1) + horseRating;
  const newQualityLevel = totalQuality / newCount;

  return {
    ...aiState,
    rosterComposition: {
      ...composition,
      currentAgeDistribution: newAgeDistribution,
      currentHorseCount: newCount,
      currentQualityLevel: newQualityLevel,
    },
  };
}

export function recordHorseGeneration(
  aiState: HorseGenAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
): HorseGenAIState {
  const generation: HorseGeneration = {
    horseId: horse.id,
    horseRating: calculateOverallRating(horse),
    age: horse.age,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.generationHistory, generation];

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  const contextKey = horse.id;
  const value = calculateOverallRating(horse);
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "horse_generation",
    contextKey,
    generation.success ?? true,
    value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  const updatedState = {
    ...aiState,
    generationHistory: trimmedHistory,
    learningState: newLearningState,
  };

  return updateRosterComposition(updatedState, horse);
}

export function recordHorseCareerOutcome(
  aiState: HorseGenAIState,
  horseId: string,
  careerEarnings: number,
  currentDay: number,
): HorseGenAIState {
  const generationIndex = aiState.generationHistory.findIndex(
    (g) => g.horseId === horseId && g.success === undefined,
  );

  if (generationIndex !== -1) {
    const generation = { ...aiState.generationHistory[generationIndex] };
    generation.success = careerEarnings > 100000;
    generation.careerEarnings = careerEarnings;

    const newHistory = [...aiState.generationHistory];
    newHistory[generationIndex] = generation;

    const contextKey = { horseId };
    const value = careerEarnings / 10000;
    const newPersonalityState = recordPersonalityOutcome(
      aiState.personalityState,
      "horse_generation",
      contextKey,
      true,
      value,
      currentDay,
    );

    const newLearningState = recordLearningOutcome(
      aiState.learningState,
      "horse_generation",
      horseId,
      true,
      value,
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    return {
      ...aiState,
      generationHistory: newHistory,
      learningState: newLearningState,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

export function getGenerationInsights(
  aiState: HorseGenAIState,
  stableId: string,
): {
  totalGenerated: number;
  avgQuality: number;
  successRate: number;
  avgCareerEarnings: number;
  rosterBalance: number;
} {
  const stableHistory = aiState.generationHistory.filter((g) => g.stableId === stableId);
  const totalGenerated = stableHistory.length;
  const avgQuality =
    totalGenerated > 0
      ? stableHistory.reduce((sum, g) => sum + g.horseRating, 0) / totalGenerated
      : 0;
  const successes = stableHistory.filter((g) => g.success).length;
  const successRate = totalGenerated > 0 ? successes / totalGenerated : 0.5;
  const avgCareerEarnings =
    totalGenerated > 0
      ? stableHistory.reduce((sum, g) => sum + (g.careerEarnings || 0), 0) / totalGenerated
      : 0;

  const composition = aiState.rosterComposition;
  let balanceScore = 0;
  const ageKeys = Object.keys(composition.targetAgeDistribution);
  for (const ageKey of ageKeys) {
    const age = parseInt(ageKey);
    const target = composition.targetAgeDistribution[age];
    const current = composition.currentAgeDistribution[age] || 0;
    balanceScore += 1 - Math.abs(target - current) / (target || 1);
  }
  const rosterBalance = ageKeys.length > 0 ? balanceScore / ageKeys.length : 1;

  return {
    totalGenerated,
    avgQuality,
    successRate,
    avgCareerEarnings,
    rosterBalance,
  };
}

export function analyzeRosterGaps(horses: Horse[]): {
  type: "sprint" | "middle" | "stayer" | "turf" | "dirt" | "young" | "balanced";
  reason: string;
} {
  if (horses.length === 0) {
    return { type: "balanced", reason: "empty_roster" };
  }

  const sprinters = horses.filter((h) => h.distanceAptitude < 0.4).length;
  const stayers = horses.filter((h) => h.distanceAptitude > 0.7).length;

  const turfHorses = horses.filter((h) => h.surfaceAptitude.Turf > 0.6).length;
  const dirtHorses = horses.filter((h) => h.surfaceAptitude.Dirt > 0.6).length;

  const youngHorses = horses.filter((h) => h.age <= 3).length;

  if (sprinters === 0 && horses.length >= 3) {
    return { type: "sprint", reason: "no_sprinters" };
  }

  if (stayers === 0 && horses.length >= 5) {
    return { type: "stayer", reason: "no_stayers" };
  }

  if (turfHorses === 0 && dirtHorses > 0) {
    return { type: "turf", reason: "no_turf_horses" };
  }
  if (dirtHorses === 0 && turfHorses > 0) {
    return { type: "dirt", reason: "no_dirt_horses" };
  }

  if (youngHorses < Math.ceil(horses.length * 0.3)) {
    return { type: "young", reason: "aging_roster" };
  }

  return { type: "balanced", reason: "well_balanced" };
}
