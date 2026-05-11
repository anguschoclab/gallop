/**
 * Withdrawal AI System
 * Risk assessment, strategic management of race withdrawals
 */

import type { Horse, Race, Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";

export interface WithdrawalAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  withdrawalHistory: WithdrawalDecision[];
}

export interface WithdrawalDecision {
  horseId: string;
  raceId: string;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  withdrew: boolean;
  reason?: string;
  outcome?: {
    horseResult?: number;
    alternativeRaceResult?: number;
  };
}

/**
 * Create AI state for withdrawal decisions
 */
export function createWithdrawalAIState(stable: Stable): WithdrawalAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    withdrawalHistory: [],
  };
}

/**
 * Calculate withdrawal risk score
 */
export function calculateWithdrawalRisk(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
): number {
  let risk = 0;

  // Health risk
  if (horse.healthStatus !== "healthy") {
    risk += 30;
  }

  // Low energy risk
  if (horse.energy < 50) {
    risk += (50 - horse.energy) / 2;
  }

  // Low form risk
  if (horse.form < 50) {
    risk += (50 - horse.form) / 2;
  }

  // Recent poor performance (would need race history)
  // For now, use form as proxy

  // Race difficulty risk (grade from graded object)
  if (race.graded?.grade === "G1") risk += 10;
  if (race.graded?.grade === "G2") risk += 5;

  // Distance mismatch risk
  const distDiff = Math.abs(horse.distanceAptitude - race.distance);
  if (distDiff > 500) risk += 15;
  if (distDiff > 300) risk += 5;

  // Surface mismatch risk
  if (race.surface && horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"] < 0.9) {
    risk += 10;
  }

  return Math.min(100, risk);
}

/**
 * Determine if horse should be withdrawn from race
 */
export function shouldWithdrawHorse(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): { shouldWithdraw: boolean; reason?: string } {
  const riskScore = calculateWithdrawalRisk(aiState, horse, race, stable);

  // Personality-based risk tolerance
  const config = aiState.personalityState;
  let riskTolerance = 50;

  if (config.personality === "conservative") riskTolerance = 35;
  if (config.personality === "aggressive") riskTolerance = 65;
  if (config.personality === "win-now") riskTolerance = 55; // Will take more risks for wins

  // Learning-based adjustment
  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "withdrawal", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 10;
  riskTolerance += adaptiveBonus;

  // Strategic considerations
  let reason: string | undefined;

  // High health risk
  if (horse.healthStatus !== "healthy") {
    reason = "health_concern";
  }
  // Very low energy
  else if (horse.energy < 30) {
    reason = "low_energy";
  }
  // Very low form
  else if (horse.form < 30) {
    reason = "poor_form";
  }

  // Decision: withdraw if risk exceeds tolerance
  if (riskScore > riskTolerance) {
    return { shouldWithdraw: true, reason };
  }

  return { shouldWithdraw: false };
}

/**
 * Calculate withdrawal opportunity cost
 */
export function calculateWithdrawalOpportunityCost(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
): number {
  let cost = 0;

  // Entry fee loss
  cost += race.entryFee || 0;

  // Transportation cost loss
  cost += 500; // Average transport cost

  // Potential prize loss
  const horseRating = calculateOverallRating(horse);
  const expectedPrize = horseRating * 100; // Rough estimate
  cost += expectedPrize * 0.1; // 10% chance of winning

  // Personality-based cost perception
  const config = aiState.personalityState;
  if (config.personality === "conservative") {
    cost *= 0.8; // Less sensitive to opportunity cost
  } else if (config.personality === "aggressive") {
    cost *= 1.2; // More sensitive to opportunity cost
  }

  return cost;
}

/**
 * Determine if withdrawal is strategically beneficial
 */
export function isWithdrawalStrategic(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): boolean {
  const { shouldWithdraw, reason } = shouldWithdrawHorse(aiState, horse, race, stable, currentDay);

  if (!shouldWithdraw) return false;

  // Check if there's a better alternative race soon
  const opportunityCost = calculateWithdrawalOpportunityCost(aiState, horse, race, stable);

  // Personality-based strategic decision
  const config = aiState.personalityState;

  // Conservative stables withdraw more readily to protect horses
  if (config.personality === "conservative" && reason === "health_concern") {
    return true;
  }

  // Win-now stables only withdraw for serious reasons
  if (config.personality === "win-now" && reason !== "health_concern") {
    return false;
  }

  // Aggressive stables take risks
  if (config.personality === "aggressive" && opportunityCost > 10000) {
    return false; // Won't withdraw if prize is high
  }

  return true;
}

/**
 * Record withdrawal decision for learning
 */
export function recordWithdrawalDecision(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  withdrew: boolean,
  reason: string | undefined,
  currentDay: number,
): WithdrawalAIState {
  const decision: WithdrawalDecision = {
    horseId: horse.id,
    raceId: race.id,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
    withdrew,
    reason,
  };

  aiState.withdrawalHistory.push(decision);

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  if (aiState.withdrawalHistory.length > maxHistory) {
    aiState.withdrawalHistory = aiState.withdrawalHistory.slice(-maxHistory);
  }

  // Update learning state
  const contextKey = `${horse.age}`;
  const value = withdrew ? -1 : 1; // Simple success metric
  aiState.learningState = recordOutcome(
    aiState.learningState,
    "withdrawal",
    contextKey,
    true,
    value,
    Date.now(),
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return aiState;
}

/**
 * Record withdrawal outcome for learning
 */
export function recordWithdrawalOutcome(
  aiState: WithdrawalAIState,
  horseId: string,
  raceId: string,
  horseResult: number | undefined,
  alternativeRaceResult: number | undefined,
  currentDay: number,
): WithdrawalAIState {
  const decision = aiState.withdrawalHistory.find(
    (d) => d.horseId === horseId && d.raceId === raceId && !d.outcome,
  );

  if (decision) {
    decision.outcome = {
      horseResult,
      alternativeRaceResult,
    };

    // Update learning state
    const contextKey = decision.personality;
    const success = decision.withdrew
      ? (alternativeRaceResult || 0) > (horseResult || 0)
      : (horseResult || 0) <= 3;

    aiState.learningState = recordOutcome(
      aiState.learningState,
      "withdrawal",
      contextKey,
      success,
      decision.withdrew ? (alternativeRaceResult || 0) - (horseResult || 0) : horseResult || 0,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );
  }

  return aiState;
}

/**
 * Get withdrawal insights for a stable
 */
export function getWithdrawalInsights(
  aiState: WithdrawalAIState,
  stableId: string,
): {
  totalDecisions: number;
  withdrawalRate: number;
  avgRiskScore: number;
  strategicSuccess: number;
  commonReasons: Record<string, number>;
} {
  const stableHistory = aiState.withdrawalHistory.filter((d) => d.stableId === stableId);
  const totalDecisions = stableHistory.length;
  const withdrawals = stableHistory.filter((d) => d.withdrew).length;
  const withdrawalRate = totalDecisions > 0 ? withdrawals / totalDecisions : 0;

  // Calculate average risk score for withdrawals
  const withdrawalDecisions = stableHistory.filter((d) => d.withdrew);
  const avgRiskScore = withdrawalDecisions.length > 0 ? 60 : 40; // Simplified

  // Strategic success: did withdrawals lead to better outcomes?
  const successfulWithdrawals = stableHistory.filter(
    (d) =>
      d.withdrew &&
      d.outcome &&
      d.outcome.alternativeRaceResult &&
      d.outcome.horseResult &&
      d.outcome.alternativeRaceResult < d.outcome.horseResult,
  ).length;
  const strategicSuccess =
    withdrawalDecisions.length > 0 ? successfulWithdrawals / withdrawalDecisions.length : 0.5;

  // Common reasons
  const commonReasons: Record<string, number> = {};
  for (const decision of withdrawalDecisions) {
    if (decision.reason) {
      commonReasons[decision.reason] = (commonReasons[decision.reason] || 0) + 1;
    }
  }

  return {
    totalDecisions,
    withdrawalRate,
    avgRiskScore,
    strategicSuccess,
    commonReasons,
  };
}
