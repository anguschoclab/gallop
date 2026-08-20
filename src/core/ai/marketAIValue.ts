/**
 * marketAIValue.ts - Purchase value calculation and decision logic
 *
 * Extracted from marketAI.ts for modularity.
 */

import type { Horse, Stable } from "@/game/types";
import { calculateUtilityScore } from "./personalitySystem";
import { getSuccessRate, getAdaptiveThreshold } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import {
  PURCHASE_BASE_THRESHOLD,
  PURCHASE_CASH_BUFFER_MULTIPLIER,
  HORSE_RATING_TO_VALUE_MULTIPLIER,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "@/constants/aiConstants";
import type { MarketAIState } from "./marketAITypes";

/**
 * Calculate purchase value score for a horse.
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

  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * HORSE_RATING_TO_VALUE_MULTIPLIER;
  const valueRatio = estimatedValue / (price || 1);

  score += Math.max(0, (valueRatio - 1) * 40);

  const factors: Record<string, number> = {
    value_ratio: valueRatio,
    horse_age: horse.age,
    horse_rating: horseRating,
    purchase_price: price,
  };

  score = calculateUtilityScore(aiState.personalityState, "market_purchase", factors);

  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "market_purchase", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  const portfolio = aiState.portfolio;
  if (portfolio.currentHorseCount < portfolio.targetHorseCount) {
    score += 15;
  }

  const ageCount = portfolio.ageDistribution[horse.age] || 0;
  if (ageCount < 3) {
    score += 10;
  }

  if (horseRating >= portfolio.qualityTarget) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine if stable should purchase a horse from market.
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
  if (weight <= 0) return false;

  if (stable.cash < price * PURCHASE_CASH_BUFFER_MULTIPLIER) return false;

  const valueScore = calculatePurchaseValue(aiState, horse, price, stable);

  const contextKey = `${horse.age}`;
  const baseThreshold = PURCHASE_BASE_THRESHOLD;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "market_purchase",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  const config = aiState.personalityState;
  let threshold = adaptiveThreshold;

  if (config.personality === "aggressive") threshold -= 10;
  if (config.personality === "conservative") threshold += 10;

  threshold /= weight;

  return valueScore > threshold;
}

/**
 * Calculate maximum purchase price for a horse.
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

  let maxPrice = estimatedValue;

  const riskTolerance = aiState.personalityState.conservatism < 0.5 ? 1.2 : 0.8;
  maxPrice *= riskTolerance;

  maxPrice = Math.min(maxPrice, stable.cash * 0.2);

  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "market_purchase", contextKey);
  if (successRate < 0.4) {
    maxPrice *= 0.8;
  }

  return Math.floor(maxPrice);
}
