/**
 * claimingAI.ts - Claiming AI system
 *
 * This file provides learning from claiming outcomes, strategic value assessment,
 * and risk evaluation for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Race, Stable), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), ./learningModule (learning functions), @/core/horse/stats (calculateOverallRating)
 * Related files: npcCycleAI.ts (uses claiming AI), personalitySystem.ts (provides personality state)
 */

/**
 * Claiming AI System
 * Learning from claiming outcomes, strategic value assessment, risk evaluation
 */

import type { Horse, Race, Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import { createLearningState, recordOutcome as recordLearningOutcome } from "./learningModule";
import { getSuccessRate, getAdaptiveThreshold, type LearningState } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";

export interface ClaimingAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  claimingHistory: ClaimingDecision[];
}

export interface ClaimingDecision {
  horseId: string;
  raceId: string;
  claimingPrice: number;
  horseRating: number;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  success?: boolean;
  value?: number;
}

/**
 * Create AI state for claiming decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * and claiming history.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized claiming AI state
 */
export function createClaimingAIState(stable: Stable): ClaimingAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    claimingHistory: [],
  };
}

/**
 * Calculate claiming value score for a horse.
 *
 * Evaluates the value of claiming a horse based on rating vs price,
 * personality modifiers, learning-based adjustments, and horse form.
 *
 * @param aiState - Current claiming AI state
 * @param horse - The horse to evaluate
 * @param race - The race with claiming price
 * @param stable - The stable making the decision
 * @returns Claiming value score (0-100)
 */
export function calculateClaimingValue(
  aiState: ClaimingAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
): number {
  let score = 0;

  // Base value from horse rating vs claiming price
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * 1000;
  const valueRatio = estimatedValue / (race.claimingPrice || 1);

  // Higher score for undervalued horses
  score += Math.max(0, (valueRatio - 1) * 50);

  // Personality modifiers
  const factors: Record<string, number> = {
    value_ratio: valueRatio,
    horse_age: horse.age,
    horse_energy: horse.energy,
    claiming_price: race.claimingPrice || 0,
  };

  score = calculateUtilityScore(aiState.personalityState, "claiming", factors);

  // Learning-based adjustment
  const contextKey = `${horse.age}:${race.claimingPrice}`;
  const successRate = getSuccessRate(aiState.learningState, "claiming", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20;
  score += adaptiveBonus;

  // Risk assessment based on horse form
  const formScore = assessHorseForm(horse);
  score += formScore * 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Assess horse form based on recent performance.
 *
 * Returns a normalized form score (0-10) based on the horse's current form (0-100).
 *
 * @param horse - The horse to assess
 * @returns Normalized form score (0-10)
 */
function assessHorseForm(horse: Horse): number {
  return horse.form / 10; // Form is 0-100, normalize to 0-10
}

/**
 * Calculate risk score for claiming a horse.
 *
 * Evaluates risk based on age, health, energy, and overpayment risk.
 *
 * @param aiState - Current claiming AI state
 * @param horse - The horse to evaluate
 * @param race - The race with claiming price
 * @returns Risk score (0-100)
 */
export function calculateClaimingRisk(aiState: ClaimingAIState, horse: Horse, race: Race): number {
  let risk = 0;

  // Age risk - older horses have higher risk
  if (horse.age > 6) risk += (horse.age - 6) * 5;
  if (horse.age < 3) risk += 10; // Young horses are unpredictable

  // Health risk
  if (horse.healthStatus !== "healthy") risk += 20;

  // Low energy risk
  if (horse.energy < 50) risk += (50 - horse.energy) / 5;

  // Overpaying risk
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * 1000;
  const valueRatio = estimatedValue / (race.claimingPrice || 1);
  if (valueRatio < 0.8) risk += 30; // Overpaying significantly

  return Math.min(100, risk);
}

/**
 * Determine if stable should claim a horse.
 *
 * Checks basic constraints, calculates value and risk scores,
 * and uses adaptive threshold for decision making.
 *
 * @param aiState - Current claiming AI state
 * @param horse - The horse to potentially claim
 * @param race - The race with claiming price
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @param friction - Friction value with player (optional, for rivalry behavior)
 * @returns True if stable should claim the horse
 */
export function shouldClaimHorse(
  aiState: ClaimingAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
  friction?: number,
): boolean {
  // Basic checks
  if (!race.claimingPrice) return false;
  if (stable.cash < race.claimingPrice * 1.1) return false;

  // Calculate value and risk
  let valueScore = calculateClaimingValue(aiState, horse, race, stable);
  const riskScore = calculateClaimingRisk(aiState, horse, race);

  // Apply friction multiplier if targeting player-owned horse with high friction
  if (horse.owned && friction && friction >= 50) {
    const frictionMultiplier = 1 + (friction - 50) / 100; // max +0.5x at friction=100
    valueScore *= frictionMultiplier;
  }

  // Get adaptive threshold based on personality and learning
  const contextKey = `${horse.age}:${race.claimingPrice}`;
  const baseThreshold = 50;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "claiming",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  // Personality-specific risk tolerance
  const riskTolerance = aiState.personalityState.conservatism < 0.5 ? 0.7 : 0.5;

  // Decision: claim if value exceeds threshold and risk is acceptable
  const adjustedValue = valueScore - riskScore * (1 - riskTolerance);

  return adjustedValue > adaptiveThreshold;
}

/**
 * Record claiming decision for learning.
 *
 * Records the claiming decision in history for tracking
 * and learning purposes.
 *
 * @param aiState - Current claiming AI state
 * @param horse - The horse being claimed
 * @param race - The race with claiming price
 * @param stable - The stable making the claim
 * @param currentDay - Current game day
 * @returns Updated claiming AI state
 */
export function recordClaimingDecision(
  aiState: ClaimingAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): ClaimingAIState {
  const decision: ClaimingDecision = {
    horseId: horse.id,
    raceId: race.id,
    claimingPrice: race.claimingPrice || 0,
    horseRating: calculateOverallRating(horse),
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.claimingHistory, decision];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  return {
    ...aiState,
    claimingHistory: trimmedHistory,
  };
}

/**
 * Record claiming outcome for learning.
 *
 * Finds the matching decision, records the outcome, and updates
 * the learning state for adaptive improvement.
 *
 * @param aiState - Current claiming AI state
 * @param horseId - ID of the claimed horse
 * @param raceId - ID of the race
 * @param success - Whether the claim was successful
 * @param value - Value of the outcome
 * @param currentDay - Current game day
 * @returns Updated claiming AI state
 */
export function recordClaimingOutcome(
  aiState: ClaimingAIState,
  horseId: string,
  raceId: string,
  success: boolean,
  value: number,
  currentDay: number,
): ClaimingAIState {
  const decisionIndex = aiState.claimingHistory.findIndex(
    (d) => d.horseId === horseId && d.raceId === raceId && !d.success,
  );

  if (decisionIndex !== -1) {
    const decision = { ...aiState.claimingHistory[decisionIndex] };
    decision.success = success;
    decision.value = value;

    const newHistory = [...aiState.claimingHistory];
    newHistory[decisionIndex] = decision;

    // Update learning state
    const newLearningState = recordLearningOutcome(
      aiState.learningState,
      "claiming",
      `${raceId}:${horseId}`,
      success,
      value,
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    return {
      ...aiState,
      claimingHistory: newHistory,
      learningState: newLearningState,
    };
  }

  return aiState;
}

/**
 * Get claiming insights for a stable.
 *
 * Calculates claiming statistics including total claims, success rate,
 * average value, and average risk.
 *
 * @param aiState - Current claiming AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with claiming statistics
 */
export function getClaimingInsights(
  aiState: ClaimingAIState,
  stableId: string,
): {
  totalClaims: number;
  successRate: number;
  avgValue: number;
  avgRisk: number;
} {
  const stableHistory = aiState.claimingHistory.filter(
    (d) => d.stableId === stableId && d.success !== undefined,
  );
  const totalClaims = stableHistory.length;
  const successes = stableHistory.filter((d) => d.success).length;
  const successRate = totalClaims > 0 ? successes / totalClaims : 0.5;
  const avgValue =
    totalClaims > 0 ? stableHistory.reduce((sum, d) => sum + (d.value || 0), 0) / totalClaims : 0;

  // Calculate average risk (simplified)
  const avgRisk = successRate < 0.5 ? 60 : 40;

  return {
    totalClaims,
    successRate,
    avgValue,
    avgRisk,
  };
}
