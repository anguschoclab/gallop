/**
 * horseGenAI.ts - Horse generation AI system
 *
 * This file provides personality-driven stock generation, roster composition,
 * and learning from outcomes for NPC stables.
 *
 * Dependencies: @/game/types (Stable, Horse), ./personalitySystem (getPersonalityAIState), ./learningModule (learning functions), @/core/horse/stats (calculateOverallRating)
 * Related files: npcCycleAI.ts (uses horse generation AI), personalitySystem.ts (provides personality state)
 */

/**
 * Horse Generation AI System
 * Personality-driven stock generation, roster composition, learning from outcomes
 */

import type { Horse, Race, Stable } from "@/game/types";
import { getPersonalityAIState, recordPersonalityOutcome } from "./personalitySystem";
import {
  createLearningState,
  recordLearningOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
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
 * Configuration for personality-driven horse generation strategy.
 */
interface HorseGenStrategy {
  targetHorseCount: number;
  targetQualityLevel: number;
  ageDistribution: (targetCount: number) => Record<number, number>;
  agePriorityBonus: (age: number) => number;
  qualityPriorityBonus: (rating: number) => number;
  generationThreshold: (age: number) => number;
}

/**
 * Registry of horse generation strategies indexed by stable personality.
 */
const HORSE_GEN_STRATEGIES: Record<Stable["personality"], HorseGenStrategy> = {
  prestige: {
    targetHorseCount: 15,
    targetQualityLevel: 75,
    ageDistribution: (target) => ({
      2: target * 0.3,
      3: target * 0.3,
      4: target * 0.2,
      5: target * 0.1,
      6: target * 0.1,
    }),
    agePriorityBonus: (age) => (age <= 3 ? 15 : 0),
    qualityPriorityBonus: (rating) => (rating > 75 ? 20 : 0),
    generationThreshold: (age) => (age <= 3 ? 20 : 30),
  },
  "win-now": {
    targetHorseCount: 10,
    targetQualityLevel: 70,
    ageDistribution: (target) => ({
      3: target * 0.2,
      4: target * 0.4,
      5: target * 0.3,
      6: target * 0.1,
    }),
    agePriorityBonus: (age) => (age >= 3 && age <= 5 ? 15 : 0),
    qualityPriorityBonus: (rating) => (rating > 70 ? 15 : 0),
    generationThreshold: (age) => (age >= 4 ? 25 : 30),
  },
  conservative: {
    targetHorseCount: 10,
    targetQualityLevel: 60,
    ageDistribution: (target) => ({
      2: target * 0.2,
      3: target * 0.25,
      4: target * 0.25,
      5: target * 0.2,
      6: target * 0.1,
    }),
    agePriorityBonus: () => 0,
    qualityPriorityBonus: () => 0,
    generationThreshold: () => 40,
  },
  aggressive: {
    targetHorseCount: 10,
    targetQualityLevel: 65,
    ageDistribution: (target) => ({
      2: target * 0.25,
      3: target * 0.25,
      4: target * 0.25,
      5: target * 0.15,
      6: target * 0.1,
    }),
    agePriorityBonus: () => 0,
    qualityPriorityBonus: () => 0,
    generationThreshold: () => 30,
  },
  developer: {
    targetHorseCount: 10,
    targetQualityLevel: 60,
    ageDistribution: (target) => ({
      2: target * 0.25,
      3: target * 0.25,
      4: target * 0.25,
      5: target * 0.15,
      6: target * 0.1,
    }),
    agePriorityBonus: () => 0,
    qualityPriorityBonus: () => 0,
    generationThreshold: () => 30,
  },
  trader: {
    targetHorseCount: 10,
    targetQualityLevel: 60,
    ageDistribution: (target) => ({
      2: target * 0.25,
      3: target * 0.25,
      4: target * 0.25,
      5: target * 0.15,
      6: target * 0.1,
    }),
    agePriorityBonus: () => 0,
    qualityPriorityBonus: () => 0,
    generationThreshold: () => 30,
  },
  specialist: {
    targetHorseCount: 10,
    targetQualityLevel: 60,
    ageDistribution: (target) => ({
      2: target * 0.25,
      3: target * 0.25,
      4: target * 0.25,
      5: target * 0.15,
      6: target * 0.1,
    }),
    agePriorityBonus: () => 0,
    qualityPriorityBonus: () => 0,
    generationThreshold: () => 30,
  },
  breeder: {
    targetHorseCount: 10,
    targetQualityLevel: 60,
    ageDistribution: (target) => ({
      2: target * 0.25,
      3: target * 0.25,
      4: target * 0.25,
      5: target * 0.15,
      6: target * 0.1,
    }),
    agePriorityBonus: () => 0,
    qualityPriorityBonus: () => 0,
    generationThreshold: () => 30,
  },
};

/**
 * Create AI state for horse generation decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * generation history, and roster composition.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized horse generation AI state
 */
export function createHorseGenAIState(stable: Stable): HorseGenAIState {
  const strategy = HORSE_GEN_STRATEGIES[stable.personality];

  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    generationHistory: [],
    rosterComposition: {
      targetAgeDistribution: strategy.ageDistribution(strategy.targetHorseCount),
      currentAgeDistribution: {},
      targetQualityLevel: strategy.targetQualityLevel,
      currentQualityLevel: 50,
      targetHorseCount: strategy.targetHorseCount,
      currentHorseCount: 0,
    },
  };
}

/**
 * Calculate generation priority for a horse age.
 *
 * Evaluates the priority of generating a horse of a specific age
 * based on roster deficit and personality preferences.
 *
 * @param aiState - Current horse generation AI state
 * @param age - The horse age to evaluate
 * @param stable - The stable making the decision
 * @returns Generation priority score (0-100)
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

  const strategy = HORSE_GEN_STRATEGIES[stable.personality];
  priority += strategy.agePriorityBonus(age);

  return Math.min(100, priority);
}

/**
 * Calculate generation priority for a horse quality.
 *
 * Evaluates the priority of generating a horse of a specific quality
 * based on target quality level and personality preferences.
 *
 * @param aiState - Current horse generation AI state
 * @param horseRating - The horse rating to evaluate
 * @param stable - The stable making the decision
 * @returns Generation priority score (0-100)
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

  const strategy = HORSE_GEN_STRATEGIES[stable.personality];
  priority += strategy.qualityPriorityBonus(horseRating);

  return Math.min(100, priority);
}

/**
 * Determine if stable should generate a horse of specific age.
 *
 * Evaluates whether to generate a horse of a specific age based on
 * generation priority, roster capacity, and personality threshold.
 *
 * @param aiState - Current horse generation AI state
 * @param age - The horse age to generate
 * @param stable - The stable making the decision
 * @returns True if stable should generate a horse of this age
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

  const strategy = HORSE_GEN_STRATEGIES[stable.personality];
  const threshold = strategy.generationThreshold(age);

  return priority > threshold;
}
