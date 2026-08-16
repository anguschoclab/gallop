/**
 * marketAI.ts - Market AI system
 *
 * This file provides learning from market purchases, strategic purchase decisions,
 * and portfolio buying for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Stable), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), ./learningModule (learning functions), @/core/horse/stats (calculateOverallRating)
 * Related files: npcCycleAI.ts (uses market AI), personalitySystem.ts (provides personality state)
 */

/**
 * Market AI System
 * Learning from market purchases, strategic purchase decisions, portfolio buying
 */

import type { Horse, Stable } from "@/game/types";
import { getPersonalityAIState, recordPersonalityOutcome, calculateUtilityScore } from "./personalitySystem";
import { createLearningState, recordLearningOutcome } from "./learningModule";
import { getSuccessRate, getAdaptiveThreshold, type LearningState } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import {
  PURCHASE_BASE_THRESHOLD,
  PURCHASE_CASH_BUFFER_MULTIPLIER,
  HORSE_RATING_TO_VALUE_MULTIPLIER,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "@/constants/aiConstants";

export interface MarketAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  purchaseHistory: MarketPurchase[];
  portfolio: PortfolioState;
}

export interface MarketPurchase {
  horseId: string;
  horseRating: number;
  purchasePrice: number;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  success?: boolean;
  value?: number;
}

export interface PortfolioState {
  targetHorseCount: number;
  currentHorseCount: number;
  budgetRemaining: number;
  ageDistribution: Record<number, number>;
  qualityTarget: number;
}

/**
 * Create AI state for market decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * purchase history, and portfolio state.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized market AI state
 */
export function createMarketAIState(stable: Stable): MarketAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    purchaseHistory: [],
    portfolio: {
      targetHorseCount: stable.personality === "prestige" ? 15 : 10,
      currentHorseCount: 0,
      budgetRemaining: stable.cash,
      ageDistribution: {},
      qualityTarget: 60,
    },
  };
}

/**
 * Calculate purchase value score for a horse.
 *
 * Evaluates the value of purchasing a horse based on rating vs price,
 * personality modifiers, learning-based adjustments, and portfolio fit.
 *
 * @param aiState - Current market AI state
 * @param horse - The horse to evaluate
 * @param price - The purchase price
 * @param stable - The stable making the decision
 * @returns Purchase value score (0-100)
 */
export function calculatePurchaseValue(
  aiState: MarketAIState,
  horse: Horse,
  price: number,
  stable: Stable,
): number {
  let score = 0;

  // Base value from horse rating vs price
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * HORSE_RATING_TO_VALUE_MULTIPLIER;
  const valueRatio = estimatedValue / (price || 1);

  // Higher score for undervalued horses
  score += Math.max(0, (valueRatio - 1) * 40);

  // Personality modifiers
  const factors: Record<string, number> = {
    value_ratio: valueRatio,
    horse_age: horse.age,
    horse_rating: horseRating,
    purchase_price: price,
  };

  score = calculateUtilityScore(aiState.personalityState, "market_purchase", factors);

  // Learning-based adjustment
  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "market_purchase", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  // Portfolio fit
  const portfolio = aiState.portfolio;
  if (portfolio.currentHorseCount < portfolio.targetHorseCount) {
    score += 15;
  }

  // Age distribution fit
  const ageCount = portfolio.ageDistribution[horse.age] || 0;
  if (ageCount < 3) {
    score += 10;
  }

  // Quality fit
  if (horseRating >= portfolio.qualityTarget) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine if stable should purchase a horse from market.
 *
 * Evaluates purchase decision based on value score, adaptive threshold,
 * and personality-based threshold adjustment.
 *
 * @param aiState - Current market AI state
 * @param horse - The horse to purchase
 * @param price - The purchase price
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @param weight - Subsystem weight that modulates purchase willingness (default 1.0)
 * @returns True if stable should purchase the horse
 */
export function shouldPurchaseHorse(
  aiState: MarketAIState,
  horse: Horse,
  price: number,
  stable: Stable,
  currentDay: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
): boolean {
  // Weight ≤ 0 → never purchase
  if (weight <= 0) return false;

  // Basic checks
  if (stable.cash < price * PURCHASE_CASH_BUFFER_MULTIPLIER) return false;

  // Calculate value score
  const valueScore = calculatePurchaseValue(aiState, horse, price, stable);

  // Get adaptive threshold
  const contextKey = `${horse.age}`;
  const baseThreshold = PURCHASE_BASE_THRESHOLD;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "market_purchase",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  // Personality-based threshold adjustment
  const config = aiState.personalityState;
  let threshold = adaptiveThreshold;

  if (config.personality === "aggressive") threshold -= 10;
  if (config.personality === "conservative") threshold += 10;

  // Weight modulates threshold: higher weight → lower threshold → more likely to purchase
  threshold /= weight;

  return valueScore > threshold;
}

/**
 * Calculate maximum purchase price for a horse.
 *
 * Calculates the maximum price based on estimated value, personality
 * risk tolerance, budget constraints, and learning-based adjustments.
 *
 * @param aiState - Current market AI state
 * @param horse - The horse to evaluate
 * @param stable - The stable making the decision
 * @returns Maximum purchase price
 */
export function calculateMaxPurchasePrice(
  aiState: MarketAIState,
  horse: Horse,
  stable: Stable,
): number {
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * HORSE_RATING_TO_VALUE_MULTIPLIER;

  // Base max price is estimated value
  let maxPrice = estimatedValue;

  // Personality-based risk tolerance
  const riskTolerance = aiState.personalityState.conservatism < 0.5 ? 1.2 : 0.8;
  maxPrice *= riskTolerance;

  // Budget constraint (max 20% of cash per horse)
  maxPrice = Math.min(maxPrice, stable.cash * 0.2);

  // Learning-based adjustment
  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "market_purchase", contextKey);
  if (successRate < 0.4) {
    maxPrice *= 0.8;
  }

  return Math.floor(maxPrice);
}

/**
 * Record market purchase for learning.
 *
 * Records the market purchase in history, updates portfolio state,
 * and updates the learning state for adaptive improvement.
 *
 * @param aiState - Current market AI state
 * @param horse - The horse being purchased
 * @param price - The purchase price
 * @param stable - The stable making the purchase
 * @param currentDay - Current game day
 * @returns Updated market AI state
 */
export function recordMarketPurchase(
  aiState: MarketAIState,
  horse: Horse,
  price: number,
  stable: Stable,
  currentDay: number,
): MarketAIState {
  const purchase: MarketPurchase = {
    horseId: horse.id,
    horseRating: calculateOverallRating(horse),
    purchasePrice: price,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.purchaseHistory, purchase];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  // Update portfolio
  const newPortfolio = {
    ...aiState.portfolio,
    currentHorseCount: aiState.portfolio.currentHorseCount + 1,
    budgetRemaining: aiState.portfolio.budgetRemaining - price,
    ageDistribution: {
      ...aiState.portfolio.ageDistribution,
      [horse.age]: (aiState.portfolio.ageDistribution[horse.age] || 0) + 1,
    },
  };

  // Update learning state
  const contextKey = `${horse.age}`;
  const value = calculateOverallRating(horse) - price / 1000;
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "market_purchase",
    contextKey,
    true,
    value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return {
    ...aiState,
    purchaseHistory: trimmedHistory,
    portfolio: newPortfolio,
    learningState: newLearningState,
  };
}

/**
 * Record market outcome for learning.
 *
 * Finds the matching purchase, records the outcome, and updates
 * the learning state for adaptive improvement.
 *
 * @param aiState - Current market AI state
 * @param horseId - ID of the purchased horse
 * @param success - Whether the purchase was successful
 * @param value - Value of the outcome
 * @param currentDay - Current game day
 * @returns Updated market AI state
 */
export function recordMarketOutcome(
  aiState: MarketAIState,
  horseId: string,
  success: boolean,
  value: number,
  currentDay: number,
): MarketAIState {
  const purchaseIndex = aiState.purchaseHistory.findIndex(
    (p) => p.horseId === horseId && p.success === undefined,
  );

  if (purchaseIndex !== -1) {
    const purchase = { ...aiState.purchaseHistory[purchaseIndex] };
    purchase.success = success;
    purchase.value = value;

    const newHistory = [...aiState.purchaseHistory];
    newHistory[purchaseIndex] = purchase;

    // Update personality state
    const newLearningState = recordLearningOutcome(
      aiState.learningState,
      "sale",
      horseId,
      success,
      value,
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    return {
      ...aiState,
      purchaseHistory: newHistory,
      learningState: newLearningState,
    };
  }

  return aiState;
}

/**
 * Get market insights for a stable.
 *
 * Calculates market statistics including total purchases, success rate,
 * average value, average purchase price, and portfolio health.
 *
 * @param aiState - Current market AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with market statistics
 */
export function getMarketInsights(
  aiState: MarketAIState,
  stableId: string,
): {
  totalPurchases: number;
  successRate: number;
  avgValue: number;
  avgPurchasePrice: number;
  portfolioHealth: number;
} {
  const stablePurchases = aiState.purchaseHistory.filter((p) => p.stableId === stableId);
  const totalPurchases = stablePurchases.length;
  const successes = stablePurchases.filter((p) => p.success).length;
  const successRate = totalPurchases > 0 ? successes / totalPurchases : 0.5;
  const avgValue =
    totalPurchases > 0
      ? stablePurchases.reduce((sum, p) => sum + (p.value || 0), 0) / totalPurchases
      : 0;
  const avgPurchasePrice =
    totalPurchases > 0
      ? stablePurchases.reduce((sum, p) => sum + p.purchasePrice, 0) / totalPurchases
      : 0;

  const portfolioHealth =
    aiState.portfolio.currentHorseCount / (aiState.portfolio.targetHorseCount || 1);

  return {
    totalPurchases,
    successRate,
    avgValue,
    avgPurchasePrice,
    portfolioHealth,
  };
}

// ─── Market Timing ───────────────────────────────────────────────────────────

/**
 * Determine if current market conditions favor buying or waiting.
 *
 * Uses recent purchase prices to detect if the market is overheated
 * (prices above average) or depressed (prices below average).
 *
 * @param aiState - Current market AI state
 * @returns 'buy', 'wait', or 'neutral' recommendation
 */
export function getMarketTimingRecommendation(aiState: MarketAIState): "buy" | "wait" | "neutral" {
  const recentPurchases = aiState.purchaseHistory.slice(-10);
  if (recentPurchases.length < 3) return "neutral";

  const avgPrice =
    recentPurchases.reduce((sum, p) => sum + p.purchasePrice, 0) / recentPurchases.length;
  const overallAvg =
    aiState.purchaseHistory.reduce((sum, p) => sum + p.purchasePrice, 0) /
    aiState.purchaseHistory.length;

  if (avgPrice < overallAvg * 0.85) return "buy";
  if (avgPrice > overallAvg * 1.15) return "wait";
  return "neutral";
}

// ─── Price Negotiation ───────────────────────────────────────────────────────

/**
 * Calculate a negotiated purchase price based on horse value and stable personality.
 *
 * Aggressive personalities push for lower prices, while prestige personalities
 * are willing to pay closer to asking price.
 *
 * @param askingPrice - The seller's asking price
 * @param horseRating - The overall rating of the horse
 * @param personality - The stable's personality type
 * @returns Negotiated price
 */
export function calculateNegotiatedPrice(
  askingPrice: number,
  horseRating: number,
  personality: Stable["personality"],
): number {
  let discountRate = 0.05; // Default: 5% discount

  if (personality === "aggressive" || personality === "win-now") {
    discountRate = 0.12;
  } else if (personality === "trader") {
    discountRate = 0.1;
  } else if (personality === "conservative") {
    discountRate = 0.08;
  } else if (personality === "prestige") {
    discountRate = 0.02;
  }

  // High-rated horses command less discount (sellers know their value)
  if (horseRating >= 80) {
    discountRate *= 0.5;
  }

  const negotiatedPrice = askingPrice * (1 - discountRate);
  return Math.max(1000, Math.round(negotiatedPrice));
}
