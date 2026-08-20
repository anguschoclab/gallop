/**
 * marketAIRecording.ts - Market purchase recording, insights, timing, and negotiation
 *
 * Extracted from marketAI.ts for modularity.
 */

import type { Horse, Stable } from "@/game/types";
import { recordLearningOutcome } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import type { MarketAIState, MarketPurchase } from "./marketAITypes";

/**
 * Record market purchase for learning.
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

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  const newPortfolio = {
    ...aiState.portfolio,
    currentHorseCount: aiState.portfolio.currentHorseCount + 1,
    budgetRemaining: aiState.portfolio.budgetRemaining - price,
    ageDistribution: {
      ...aiState.portfolio.ageDistribution,
      [horse.age]: (aiState.portfolio.ageDistribution[horse.age] || 0) + 1,
    },
  };

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

/**
 * Determine if current market conditions favor buying or waiting.
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

/**
 * Calculate a negotiated purchase price based on horse value and stable personality.
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
  let discountRate = 0.05;

  if (personality === "aggressive" || personality === "win-now") {
    discountRate = 0.12;
  } else if (personality === "trader") {
    discountRate = 0.1;
  } else if (personality === "conservative") {
    discountRate = 0.08;
  } else if (personality === "prestige") {
    discountRate = 0.02;
  }

  if (horseRating >= 80) {
    discountRate *= 0.5;
  }

  const negotiatedPrice = askingPrice * (1 - discountRate);
  return Math.max(1000, Math.round(negotiatedPrice));
}
