/**
 * withdrawalAI.ts - Withdrawal AI system
 *
 * This file provides risk assessment and strategic management of race
 * withdrawals for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Race, Stable), ./personalitySystem (getPersonalityAIState), ./learningModule (learning functions), @/core/horse/stats (calculateOverallRating)
 * Related files: npcCycleAI.ts (uses withdrawal AI), personalitySystem.ts (provides personality state)
 */

/**
 * Withdrawal AI System
 * Risk assessment, strategic management of race withdrawals
 */

import type { Horse, Race, Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
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
 * Create AI state for withdrawal decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * and withdrawal history.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized withdrawal AI state
 */
export function createWithdrawalAIState(stable: Stable): WithdrawalAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    withdrawalHistory: [],
  };
}

/**
 * Calculate withdrawal risk score.
 *
 * Evaluates risk based on health, energy, form, race difficulty,
 * distance mismatch, and surface mismatch.
 *
 * @param aiState - Current withdrawal AI state
 * @param horse - The horse to evaluate
 * @param race - The race being considered
 * @param stable - The stable making the decision
 * @returns Risk score (0-100)
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

  // Race difficulty risk
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
 * Determine if horse should be withdrawn from race.
 *
 * Evaluates withdrawal decision based on risk score, personality
 * risk tolerance, learning-based adjustments, and strategic considerations.
 *
 * @param aiState - Current withdrawal AI state
 * @param horse - The horse to evaluate
 * @param race - The race being considered
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns Object with shouldWithdraw flag and optional reason
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
  if (config.personality === "win-now") riskTolerance = 55;

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

  if (riskScore > riskTolerance) {
    return { shouldWithdraw: true, reason };
  }

  return { shouldWithdraw: false };
}

/**
 * Calculate withdrawal opportunity cost.
 *
 * Calculates the cost of withdrawing including entry fee loss,
 * transportation cost loss, potential prize loss, and personality-based cost perception.
 *
 * @param aiState - Current withdrawal AI state
 * @param horse - The horse being withdrawn
 * @param race - The race being withdrawn from
 * @param stable - The stable making the decision
 * @returns Opportunity cost of withdrawal
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
  cost += 500;

  // Potential prize loss
  const horseRating = calculateOverallRating(horse);
  const expectedPrize = horseRating * 100;
  cost += expectedPrize * 0.1;

  // Personality-based cost perception
  const config = aiState.personalityState;
  if (config.personality === "conservative") {
    cost *= 0.8;
  } else if (config.personality === "aggressive") {
    cost *= 1.2;
  }

  return cost;
}

/**
 * Determine if withdrawal is strategically beneficial.
 *
 * Evaluates whether withdrawal is strategically beneficial based on
 * personality, reason for withdrawal, and opportunity cost.
 *
 * @param aiState - Current withdrawal AI state
 * @param horse - The horse being evaluated
 * @param race - The race being considered
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns True if withdrawal is strategically beneficial
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

  const opportunityCost = calculateWithdrawalOpportunityCost(aiState, horse, race, stable);
  const config = aiState.personalityState;

  if (config.personality === "conservative" && reason === "health_concern") {
    return true;
  }

  if (config.personality === "win-now" && reason !== "health_concern") {
    return false;
  }

  if (config.personality === "aggressive" && opportunityCost > 10000) {
    return false;
  }

  return true;
}

/**
 * Record withdrawal decision for learning.
 *
 * Records the withdrawal decision in history and updates the
 * learning state for adaptive improvement.
 *
 * @param aiState - Current withdrawal AI state
 * @param horse - The horse being evaluated
 * @param race - The race being considered
 * @param stable - The stable making the decision
 * @param withdrew - Whether the horse was withdrawn
 * @param reason - Reason for withdrawal (optional)
 * @param currentDay - Current game day
 * @returns Updated withdrawal AI state
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

  const newHistory = [...aiState.withdrawalHistory, decision];

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory = newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  const contextKey = `${horse.age}`;
  const value = withdrew ? -1 : 1;
  const newLearningState = recordOutcome(
    aiState.learningState,
    "withdrawal",
    contextKey,
    true,
    value,
    Date.now(),
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return {
    ...aiState,
    withdrawalHistory: trimmedHistory,
    learningState: newLearningState,
  };
}

/**
 * Record withdrawal outcome for learning.
 *
 * Finds the matching decision, records the outcome, and updates
 * the learning state for adaptive improvement.
 *
 * @param aiState - Current withdrawal AI state
 * @param horseId - ID of the horse
 * @param raceId - ID of the race
 * @param horseResult - Result if horse ran (optional)
 * @param alternativeRaceResult - Result from alternative race (optional)
 * @param currentDay - Current game day
 * @returns Updated withdrawal AI state
 */
export function recordWithdrawalOutcome(
  aiState: WithdrawalAIState,
  horseId: string,
  raceId: string,
  horseResult: number | undefined,
  alternativeRaceResult: number | undefined,
  currentDay: number,
): WithdrawalAIState {
  const decisionIndex = aiState.withdrawalHistory.findIndex(
    (d) => d.horseId === horseId && d.raceId === raceId && !d.outcome,
  );

  if (decisionIndex !== -1) {
    const decision = { ...aiState.withdrawalHistory[decisionIndex] };
    decision.outcome = {
      horseResult,
      alternativeRaceResult,
    };

    const newHistory = [...aiState.withdrawalHistory];
    newHistory[decisionIndex] = decision;

    const contextKey = decision.personality;
    const success = decision.withdrew
      ? (alternativeRaceResult || 0) > (horseResult || 0)
      : (horseResult || 0) <= 3;

    const newLearningState = recordOutcome(
      aiState.learningState,
      "withdrawal",
      contextKey,
      success,
      decision.withdrew ? (alternativeRaceResult || 0) - (horseResult || 0) : horseResult || 0,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    return {
      ...aiState,
      withdrawalHistory: newHistory,
      learningState: newLearningState,
    };
  }

  return aiState;
}

/**
 * Get withdrawal insights for a stable.
 *
 * Calculates withdrawal statistics including total decisions,
 * withdrawal rate, average risk score, strategic success, and common reasons.
 *
 * @param aiState - Current withdrawal AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with withdrawal statistics
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

  const withdrawalDecisions = stableHistory.filter((d) => d.withdrew);
  const avgRiskScore = withdrawalDecisions.length > 0 ? 60 : 40;

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
