/**
 * Market AI System
 * Learning from market purchases, strategic purchase decisions, portfolio buying
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
 * Create AI state for market decisions
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
 * Calculate purchase value score for a horse
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
  const estimatedValue = horseRating * 1000;
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
 * Determine if stable should purchase a horse from market
 */
export function shouldPurchaseHorse(
  aiState: MarketAIState,
  horse: Horse,
  price: number,
  stable: Stable,
  currentDay: number,
): boolean {
  // Basic checks
  if (stable.cash < price * 1.1) return false;

  // Calculate value score
  const valueScore = calculatePurchaseValue(aiState, horse, price, stable);

  // Get adaptive threshold
  const contextKey = `${horse.age}`;
  const baseThreshold = 50;
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

  return valueScore > threshold;
}

/**
 * Calculate maximum purchase price for a horse
 */
export function calculateMaxPurchasePrice(
  aiState: MarketAIState,
  horse: Horse,
  stable: Stable,
): number {
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * 1000;

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
 * Record market purchase for learning
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
  const trimmedHistory = newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

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
  const newLearningState = recordOutcome(
    aiState.learningState,
    "market_purchase",
    contextKey,
    true,
    value,
    Date.now(),
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
 * Record market outcome for learning
 */
export function recordMarketOutcome(
  aiState: MarketAIState,
  horseId: string,
  success: boolean,
  value: number,
  currentDay: number,
): MarketAIState {
  const purchaseIndex = aiState.purchaseHistory.findIndex((p) => p.horseId === horseId && p.success === undefined);

  if (purchaseIndex !== -1) {
    const purchase = { ...aiState.purchaseHistory[purchaseIndex] };
    purchase.success = success;
    purchase.value = value;

    const newHistory = [...aiState.purchaseHistory];
    newHistory[purchaseIndex] = purchase;

    // Update learning state
    const contextKey = `${purchase.horseRating}`;
    const newLearningState = recordOutcome(
      aiState.learningState,
      "market_purchase",
      contextKey,
      success,
      value,
      Date.now(),
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
 * Get market insights for a stable
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

  const portfolioHealth = aiState.portfolio.currentHorseCount / (aiState.portfolio.targetHorseCount || 1);

  return {
    totalPurchases,
    successRate,
    avgValue,
    avgPurchasePrice,
    portfolioHealth,
  };
}
