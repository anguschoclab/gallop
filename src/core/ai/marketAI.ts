/**
 * Market AI System
 * personality-driven horse acquisition and disposal (private sales, auctions)
 */

import type { Horse, Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";

export interface MarketAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  acquisitionHistory: MarketDecision[];
  disposalHistory: MarketDecision[];
  ageDistribution: Record<number, number>;
}

export interface MarketDecision {
  horseId: string;
  price: number;
  horseRating: number;
  stableId: string;
  day: number;
  type: "buy" | "sell" | "claim" | "auction";
  success?: boolean;
  value?: number;
}

/**
 * Create AI state for market decisions
 */
export function createMarketAIState(stable: Stable): MarketAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    acquisitionHistory: [],
    disposalHistory: [],
    ageDistribution: {},
  };
}

/**
 * Calculate market value score for a horse
 */
export function calculateMarketValue(
  aiState: MarketAIState,
  horse: Horse,
  stable: Stable,
): number {
  let score = 0;

  // Base value from horse rating
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * 1100;
  
  // Higher score if we need this age group
  const currentDist = aiState.ageDistribution;
  const targetCount = 5; // Simplified target
  const ageCount = currentDist[horse.age] || 0;
  if (ageCount < targetCount) score += 20;

  // Personality modifiers
  const factors: Record<string, number> = {
    horse_rating: horseRating,
    horse_age: horse.age,
    stable_cash: stable.cash,
    estimated_value: estimatedValue,
  };

  score = calculateUtilityScore(aiState.personalityState, "market_acquisition", factors);

  // Learning-based adjustment
  const contextKey = `${horse.age}:${horseRating > 60 ? "quality" : "budget"}`;
  const successRate = getSuccessRate(aiState.learningState, "market_acquisition", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine if stable should buy a horse from private sale
 */
export function shouldBuyHorse(
  aiState: MarketAIState,
  horse: Horse,
  price: number,
  stable: Stable,
  currentDay: number,
): boolean {
  if (stable.cash < price * 1.2) return false;

  const valueScore = calculateMarketValue(aiState, horse, stable);
  
  // Get adaptive threshold
  const contextKey = `${horse.age}:${price > 50000 ? "expensive" : "cheap"}`;
  const baseThreshold = 60;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "market_acquisition",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  return valueScore > adaptiveThreshold;
}

/**
 * Record market acquisition for learning
 */
export function recordAcquisition(
  aiState: MarketAIState,
  horse: Horse,
  price: number,
  type: MarketDecision["type"],
  stable: Stable,
  currentDay: number,
): MarketAIState {
  const decision: MarketDecision = {
    horseId: horse.id,
    price,
    horseRating: calculateOverallRating(horse),
    stableId: stable.id,
    day: currentDay,
    type,
  };

  const newHistory = [...aiState.acquisitionHistory, decision];

  // Trim history
  const maxHistory = aiState.personalityState.memoryDepth;
  if (newHistory.length > maxHistory) {
    newHistory.splice(0, newHistory.length - maxHistory);
  }

  // Update age distribution
  const newDist = { ...aiState.ageDistribution };
  newDist[horse.age] = (newDist[horse.age] || 0) + 1;

  return {
    ...aiState,
    acquisitionHistory: newHistory,
    ageDistribution: newDist,
  };
}
