/**
 * Horse Generation AI System
 * Personality-driven stock generation, roster composition, learning from outcomes
 */

import type { Stable, Horse } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  type LearningState,
} from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";

export interface HorseGenAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  generationHistory: HorseGeneration[];
  rosterComposition: RosterComposition;
}

export interface HorseGeneration {
  horseId: string;
  horseRating: number;
  age: number;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  success?: boolean;
  careerEarnings?: number;
}

export interface RosterComposition {
  targetAgeDistribution: Record<number, number>; // Target count by age
  currentAgeDistribution: Record<number, number>; // Current count by age
  targetQualityLevel: number; // Target average rating
  currentQualityLevel: number; // Current average rating
  targetHorseCount: number;
  currentHorseCount: number;
}

/**
 * Create AI state for horse generation decisions
 */
export function createHorseGenAIState(stable: Stable): HorseGenAIState {
  const targetHorseCount = stable.personality === "prestige" ? 15 : 10;

  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    generationHistory: [],
    rosterComposition: {
      targetAgeDistribution: calculateTargetAgeDistribution(stable.personality, targetHorseCount),
      currentAgeDistribution: {},
      targetQualityLevel: calculateTargetQualityLevel(stable.personality),
      currentQualityLevel: 50,
      targetHorseCount,
      currentHorseCount: 0,
    },
  };
}

/**
 * Calculate target age distribution based on personality
 */
function calculateTargetAgeDistribution(
  personality: Stable["personality"],
  targetCount: number,
): Record<number, number> {
  const distribution: Record<number, number> = {};

  switch (personality) {
    case "prestige":
      distribution[2] = targetCount * 0.3;
      distribution[3] = targetCount * 0.3;
      distribution[4] = targetCount * 0.2;
      distribution[5] = targetCount * 0.1;
      distribution[6] = targetCount * 0.1;
      break;
    case "win-now":
      distribution[3] = targetCount * 0.2;
      distribution[4] = targetCount * 0.4;
      distribution[5] = targetCount * 0.3;
      distribution[6] = targetCount * 0.1;
      break;
    case "conservative":
      distribution[2] = targetCount * 0.2;
      distribution[3] = targetCount * 0.25;
      distribution[4] = targetCount * 0.25;
      distribution[5] = targetCount * 0.2;
      distribution[6] = targetCount * 0.1;
      break;
    default:
      distribution[2] = targetCount * 0.25;
      distribution[3] = targetCount * 0.25;
      distribution[4] = targetCount * 0.25;
      distribution[5] = targetCount * 0.15;
      distribution[6] = targetCount * 0.1;
  }

  return distribution;
}

/**
 * Calculate target quality level based on personality
 */
function calculateTargetQualityLevel(personality: Stable["personality"]): number {
  switch (personality) {
    case "prestige":
      return 75;
    case "win-now":
      return 70;
    case "conservative":
      return 60;
    case "aggressive":
      return 65;
    default:
      return 60;
  }
}

/**
 * Calculate generation priority for a horse age
 */
export function calculateAgeGenerationPriority(
  aiState: HorseGenAIState,
  age: number,
  stable: Stable,
): number {
  const composition = aiState.rosterComposition;
  const targetCount = composition.targetAgeDistribution[age] || 0;
  const currentCount = composition.currentAgeDistribution[age] || 0;

  const deficit = targetCount - currentCount;
  let priority = Math.max(0, deficit * 20);

  const config = aiState.personalityState;
  if (config.personality === "prestige" && age <= 3) priority += 15;
  if (config.personality === "win-now" && age >= 3 && age <= 5) priority += 15;

  return Math.min(100, priority);
}

/**
 * Calculate generation priority for a horse quality
 */
export function calculateQualityGenerationPriority(
  aiState: HorseGenAIState,
  horseRating: number,
  stable: Stable,
): number {
  const composition = aiState.rosterComposition;
  const targetQuality = composition.targetQualityLevel;

  let priority = 0;
  if (horseRating >= targetQuality) {
    priority += 50;
    priority += (horseRating - targetQuality) * 2;
  } else {
    priority += (horseRating / targetQuality) * 30;
  }

  const config = aiState.personalityState;
  if (config.personality === "prestige" && horseRating > 75) priority += 20;
  if (config.personality === "win-now" && horseRating > 70) priority += 15;

  return Math.min(100, priority);
}

/**
 * Determine if stable should generate a horse of specific age
 */
export function shouldGenerateHorseOfAge(
  aiState: HorseGenAIState,
  age: number,
  stable: Stable,
): boolean {
  const priority = calculateAgeGenerationPriority(aiState, age, stable);

  const composition = aiState.rosterComposition;
  if (composition.currentHorseCount >= composition.targetHorseCount) {
    return false;
  }

  const config = aiState.personalityState;
  let threshold = 30;

  if (config.personality === "prestige" && age <= 3) threshold = 20;
  if (config.personality === "win-now" && age >= 4) threshold = 25;
  if (config.personality === "conservative") threshold = 40;

  return priority > threshold;
}

/**
 * Update roster composition after horse generation
 */
export function updateRosterComposition(aiState: HorseGenAIState, horse: Horse): HorseGenAIState {
  const composition = aiState.rosterComposition;

  const newAgeDistribution = {
    ...composition.currentAgeDistribution,
    [horse.age]: (composition.currentAgeDistribution[horse.age] || 0) + 1,
  };

  const newCount = composition.currentHorseCount + 1;

  const horseRating = calculateOverallRating(horse);
  const totalQuality =
    composition.currentQualityLevel * (newCount - 1) + horseRating;
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

/**
 * Record horse generation for learning
 */
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
  const trimmedHistory = newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  const contextKey = `${stable.personality}:${horse.age}`;
  const value = calculateOverallRating(horse);
  const newLearningState = recordOutcome(
    aiState.learningState,
    "horse_generation",
    contextKey,
    true,
    value,
    Date.now(),
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

/**
 * Record horse career outcome for learning
 */
export function recordHorseCareerOutcome(
  aiState: HorseGenAIState,
  horseId: string,
  careerEarnings: number,
  currentDay: number,
): HorseGenAIState {
  const generationIndex = aiState.generationHistory.findIndex((g) => g.horseId === horseId && g.success === undefined);

  if (generationIndex !== -1) {
    const generation = { ...aiState.generationHistory[generationIndex] };
    generation.success = careerEarnings > 100000;
    generation.careerEarnings = careerEarnings;

    const newHistory = [...aiState.generationHistory];
    newHistory[generationIndex] = generation;

    const contextKey = `${generation.personality}:${generation.age}`;
    const value = careerEarnings / 10000;
    const newLearningState = recordOutcome(
      aiState.learningState,
      "horse_generation",
      contextKey,
      generation.success,
      value,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    return {
      ...aiState,
      generationHistory: newHistory,
      learningState: newLearningState,
    };
  }

  return aiState;
}

/**
 * Get generation insights for a stable
 */
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
