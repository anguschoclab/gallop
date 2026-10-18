/**
 * claimingAIValue.ts - Value and risk calculation for claiming AI
 *
 * Extracted from claimingAI.ts for modularity.
 */

import type { Horse, Race, Stable } from "@/game/types";
import { calculateUtilityScore } from "./personalitySystem";
import { getSuccessRate } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import type { ClaimingAIState } from "./claimingAITypes";

export function calculateClaimingValue(
  aiState: ClaimingAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
): number {
  let score = 0;

  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * 1000;
  const valueRatio = estimatedValue / (race.claimingPrice || 1);

  score += Math.max(0, (valueRatio - 1) * 50);

  const factors: Record<string, number> = {
    value_ratio: valueRatio,
    horse_age: horse.age,
    horse_energy: horse.energy,
    claiming_price: race.claimingPrice || 0,
  };

  score = calculateUtilityScore(aiState.personalityState, "claiming", factors);

  const contextKey = `${horse.age}:${race.claimingPrice}`;
  const successRate = getSuccessRate(aiState.learningState, "claiming", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20;
  score += adaptiveBonus;

  const formScore = assessHorseForm(horse);
  score += formScore * 10;

  return Math.max(0, Math.min(100, score));
}

function assessHorseForm(horse: Horse): number {
  return horse.form / 10;
}

export function calculateClaimingRisk(aiState: ClaimingAIState, horse: Horse, race: Race): number {
  let risk = 0;

  if (horse.age > 6) risk += (horse.age - 6) * 5;
  if (horse.age < 3) risk += 10;

  if (horse.healthStatus !== "healthy") risk += 20;

  if (horse.energy < 50) risk += (50 - horse.energy) / 5;

  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * 1000;
  const valueRatio = estimatedValue / (race.claimingPrice || 1);
  if (valueRatio < 0.8) risk += 30;

  return Math.min(100, risk);
}
