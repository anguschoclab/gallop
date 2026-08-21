/**
 * claimingAIRecording.ts - Decision recording and insights for claiming AI
 *
 * Extracted from claimingAI.ts for modularity.
 */

import type { Horse, Race, Stable } from "@/game/types";
import { recordLearningOutcome } from "./learningModule";
import { getAdaptiveThreshold } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import type { ClaimingAIState, ClaimingDecision } from "./claimingAITypes";
import { calculateClaimingRisk, calculateClaimingValue } from "./claimingAIValue";

export function shouldClaimHorse(
  aiState: ClaimingAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
  friction?: number,
  weight = 1.0,
): boolean {
  if (!race.claimingPrice) return false;
  if (stable.cash < race.claimingPrice * 1.1) return false;

  if (weight <= 0) return false;

  let valueScore = calculateClaimingValue(aiState, horse, race, stable);
  const riskScore = calculateClaimingRisk(aiState, horse, race);

  if (horse.ownership?.type === "player" && friction && friction >= 50) {
    const frictionMultiplier = 1 + (friction - 50) / 100;
    valueScore *= frictionMultiplier;
  }

  const contextKey = `${horse.age}:${race.claimingPrice}`;
  const baseThreshold = 50;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "claiming",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  const riskTolerance = aiState.personalityState.conservatism < 0.5 ? 0.7 : 0.5;

  const adjustedValue = valueScore - riskScore * (1 - riskTolerance);
  const weightedThreshold = adaptiveThreshold / weight;

  return adjustedValue > weightedThreshold;
}

export function recordClaimingDecision(
  aiState: ClaimingAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): ClaimingAIState {
  const riskScore = calculateClaimingRisk(aiState, horse, race);
  const decision: ClaimingDecision = {
    horseId: horse.id,
    raceId: race.id,
    claimingPrice: race.claimingPrice || 0,
    horseRating: calculateOverallRating(horse),
    stableId: stable.id,
    personality: stable.personality,
    horseAge: horse.age,
    day: currentDay,
    riskScore,
  };

  const newHistory = [...aiState.claimingHistory, decision];

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  return {
    ...aiState,
    claimingHistory: trimmedHistory,
  };
}

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

    const contextKey = `${decision.horseAge}:${decision.claimingPrice}`;
    const newLearningState = recordLearningOutcome(
      aiState.learningState,
      "claiming",
      contextKey,
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

  const decisionsWithRisk = stableHistory.filter((d) => d.riskScore !== undefined);
  const avgRisk =
    decisionsWithRisk.length > 0
      ? decisionsWithRisk.reduce((sum, d) => sum + (d.riskScore || 0), 0) / decisionsWithRisk.length
      : 0;

  return {
    totalClaims,
    successRate,
    avgValue,
    avgRisk,
  };
}
