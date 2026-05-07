/**
 * Horse Generation AI System
 * Personality-driven stock generation, roster composition, learning from outcomes
 */

import type { Stable, Horse } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
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
  targetAgeDistribution: Map<number, number>; // Target count by age
  currentAgeDistribution: Map<number, number>; // Current count by age
  targetQualityLevel: number; // Target average rating
  currentQualityLevel: number; // Current average rating
  targetHorseCount: number;
  currentHorseCount: number;
}

/**
 * Create AI state for horse generation decisions
 */
export function createHorseGenAIState(stable: Stable): HorseGenAIState {
  const targetHorseCount = stable.personality === "developer" ? 15 : 10;

  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    generationHistory: [],
    rosterComposition: {
      targetAgeDistribution: calculateTargetAgeDistribution(stable.personality, targetHorseCount),
      currentAgeDistribution: new Map(),
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
function calculateTargetAgeDistribution(personality: Stable["personality"], targetCount: number): Map<number, number> {
  const distribution = new Map<number, number>();

  switch (personality) {
    case "developer":
      // Developers focus on young horses
      distribution.set(2, targetCount * 0.3);
      distribution.set(3, targetCount * 0.3);
      distribution.set(4, targetCount * 0.2);
      distribution.set(5, targetCount * 0.1);
      distribution.set(6, targetCount * 0.1);
      break;
    case "win-now":
      // Win-now focuses on prime racing age
      distribution.set(3, targetCount * 0.2);
      distribution.set(4, targetCount * 0.4);
      distribution.set(5, targetCount * 0.3);
      distribution.set(6, targetCount * 0.1);
      break;
    case "breeder":
      // Breeders need broodmares and young stock
      distribution.set(2, targetCount * 0.4);
      distribution.set(3, targetCount * 0.2);
      distribution.set(4, targetCount * 0.2);
      distribution.set(5, targetCount * 0.1);
      distribution.set(6, targetCount * 0.1);
      break;
    case "conservative":
      // Conservative balanced distribution
      distribution.set(2, targetCount * 0.2);
      distribution.set(3, targetCount * 0.25);
      distribution.set(4, targetCount * 0.25);
      distribution.set(5, targetCount * 0.2);
      distribution.set(6, targetCount * 0.1);
      break;
    default:
      // Default balanced distribution
      distribution.set(2, targetCount * 0.25);
      distribution.set(3, targetCount * 0.25);
      distribution.set(4, targetCount * 0.25);
      distribution.set(5, targetCount * 0.15);
      distribution.set(6, targetCount * 0.1);
  }

  return distribution;
}

/**
 * Calculate target quality level based on personality
 */
function calculateTargetQualityLevel(personality: Stable["personality"]): number {
  switch (personality) {
    case "prestige":
      return 75; // High quality for prestige stables
    case "win-now":
      return 70; // Good horses for winning now
    case "developer":
      return 65; // Moderate quality, focus on potential
    case "breeder":
      return 70; // Good breeding stock
    case "conservative":
      return 60; // Moderate quality, sustainable
    case "aggressive":
      return 65; // Moderate-high quality
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
  const targetCount = composition.targetAgeDistribution.get(age) || 0;
  const currentCount = composition.currentAgeDistribution.get(age) || 0;

  // Priority is higher if we need more of this age
  const deficit = targetCount - currentCount;
  let priority = Math.max(0, deficit * 20);

  // Personality modifiers
  const config = aiState.personalityState;
  if (config.personality === "developer" && age <= 3) priority += 15;
  if (config.personality === "win-now" && age >= 3 && age <= 5) priority += 15;
  if (config.personality === "breeder" && age <= 4) priority += 10;

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

  // Priority for horses at or above target quality
  let priority = 0;
  if (horseRating >= targetQuality) {
    priority += 50;
    priority += (horseRating - targetQuality) * 2; // Bonus for exceeding target
  } else {
    priority += horseRating / targetQuality * 30; // Partial credit for below target
  }

  // Personality modifiers
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

  // Check if we're at target horse count
  const composition = aiState.rosterComposition;
  if (composition.currentHorseCount >= composition.targetHorseCount) {
    return false; // At capacity
  }

  // Personality-based threshold
  const config = aiState.personalityState;
  let threshold = 30;

  if (config.personality === "developer" && age <= 3) threshold = 20;
  if (config.personality === "win-now" && age >= 4) threshold = 25;
  if (config.personality === "conservative") threshold = 40;

  return priority > threshold;
}

/**
 * Update roster composition after horse generation
 */
export function updateRosterComposition(
  aiState: HorseGenAIState,
  horse: Horse,
): HorseGenAIState {
  const composition = aiState.rosterComposition;

  // Update age distribution
  const ageCount = composition.currentAgeDistribution.get(horse.age) || 0;
  composition.currentAgeDistribution.set(horse.age, ageCount + 1);

  // Update horse count
  composition.currentHorseCount++;

  // Update quality level (running average)
  const horseRating = calculateOverallRating(horse);
  const totalQuality = composition.currentQualityLevel * (composition.currentHorseCount - 1) + horseRating;
  composition.currentQualityLevel = totalQuality / composition.currentHorseCount;

  return aiState;
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

  aiState.generationHistory.push(generation);

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  if (aiState.generationHistory.length > maxHistory) {
    aiState.generationHistory = aiState.generationHistory.slice(-maxHistory);
  }

  // Update learning state
  const contextKey = `${stable.personality}:${horse.age}`;
  const value = calculateOverallRating(horse);
  aiState.learningState = recordOutcome(
    aiState.learningState,
    "horse_generation",
    contextKey,
    true,
    value,
    Date.now(),
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  // Update roster composition
  updateRosterComposition(aiState, horse);

  return aiState;
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
  const generation = aiState.generationHistory.find((g) => g.horseId === horseId && !g.success);

  if (generation) {
    generation.success = careerEarnings > 100000; // Success if earned > 100k
    generation.careerEarnings = careerEarnings;

    // Update learning state
    const contextKey = `${generation.personality}:${generation.age}`;
    const value = careerEarnings / 10000; // Normalize to 10k units
    aiState.learningState = recordOutcome(
      aiState.learningState,
      "horse_generation",
      contextKey,
      generation.success,
      value,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );
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

  // Roster balance: how close to target distribution
  const composition = aiState.rosterComposition;
  let balanceScore = 0;
  for (const [age, target] of composition.targetAgeDistribution.entries()) {
    const current = composition.currentAgeDistribution.get(age) || 0;
    balanceScore += 1 - Math.abs(target - current) / target;
  }
  const rosterBalance = balanceScore / composition.targetAgeDistribution.size;

  return {
    totalGenerated,
    avgQuality,
    successRate,
    avgCareerEarnings,
    rosterBalance,
  };
}
