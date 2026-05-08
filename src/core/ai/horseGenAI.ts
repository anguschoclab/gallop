/**
 * Horse Generation AI System
 * Multi-factor horse generation parameters and age distribution management
 */

import type { Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";

export interface HorseGenAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  genHistory: HorseGenDecision[];
  targetAgeDistribution: Record<number, number>; // Target count by age
  currentAgeDistribution: Record<number, number>; // Current count by age
}

export interface HorseGenDecision {
  age: number;
  gender: string;
  stableId: string;
  day: number;
  success?: boolean;
}

/**
 * Create AI state for horse generation decisions
 */
export function createHorseGenAIState(stable: Stable): HorseGenAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    genHistory: [],
    targetAgeDistribution: {
      1: 5,
      2: 8,
      3: 10,
      4: 8,
      5: 5,
      6: 3,
    },
    currentAgeDistribution: {},
  };
}

/**
 * Calculate age distribution for a set of horses
 */
export function calculateAgeDistribution(horses: { age: number }[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  for (const horse of horses) {
    distribution[horse.age] = (distribution[horse.age] || 0) + 1;
  }
  return distribution;
}

/**
 * Determine optimal age for new horse generation
 */
export function determineOptimalAge(aiState: HorseGenAIState, currentHorses: { age: number }[]): number {
  const currentDist = calculateAgeDistribution(currentHorses);
  const targetDist = aiState.targetAgeDistribution;

  let bestAge = 2;
  let maxDeficit = -Infinity;

  for (const ageKey in targetDist) {
    const age = parseInt(ageKey);
    const target = targetDist[age];
    const current = currentDist[age] || 0;
    const deficit = target - current;

    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      bestAge = age;
    }
  }

  return bestAge;
}

/**
 * Record horse generation for learning
 */
export function recordHorseGenDecision(
  aiState: HorseGenAIState,
  age: number,
  gender: string,
  stableId: string,
  day: number,
): HorseGenAIState {
  const decision: HorseGenDecision = {
    age,
    gender,
    stableId,
    day,
  };

  const newHistory = [...aiState.genHistory, decision];

  // Trim history
  const maxHistory = aiState.personalityState.memoryDepth;
  if (newHistory.length > maxHistory) {
    newHistory.splice(0, newHistory.length - maxHistory);
  }

  return {
    ...aiState,
    genHistory: newHistory,
  };
}
