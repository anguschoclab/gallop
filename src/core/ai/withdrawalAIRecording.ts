/**
 * withdrawalAIRecording.ts - Decision making, recording, and insights for withdrawal AI
 *
 * Extracted from withdrawalAI.ts for modularity.
 */

import type { Horse, Race, Stable } from "@/game/types";
import { recordPersonalityOutcome } from "./personalitySystem";
import { getSuccessRate, recordLearningOutcome, trimHistory } from "./learningModule";
import {
  AI_RISK_TOLERANCE_CONSERVATIVE,
  AI_RISK_TOLERANCE_AGGRESSIVE,
  AI_RISK_TOLERANCE_WIN_NOW,
} from "@/constants";
import type { WithdrawalAIState, WithdrawalDecision } from "./withdrawalAITypes";
import { calculateWithdrawalRisk, calculateWithdrawalOpportunityCost } from "./withdrawalAIValue";

export function shouldWithdrawHorse(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): { shouldWithdraw: boolean; reason?: string } {
  const riskScore = calculateWithdrawalRisk(aiState, horse, race, stable);

  const config = aiState.personalityState;
  let riskTolerance = 50;

  if (config.personality === "conservative") riskTolerance = AI_RISK_TOLERANCE_CONSERVATIVE;
  if (config.personality === "aggressive") riskTolerance = AI_RISK_TOLERANCE_AGGRESSIVE;
  if (config.personality === "win-now") riskTolerance = AI_RISK_TOLERANCE_WIN_NOW;

  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "withdrawal", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 10;
  riskTolerance += adaptiveBonus;

  let reason: string | undefined;

  if (horse.healthStatus !== "healthy") {
    reason = "health_concern";
  } else if (horse.energy < 30) {
    reason = "low_energy";
  } else if (horse.form < 30) {
    reason = "poor_form";
  }

  if (riskScore > riskTolerance) {
    return { shouldWithdraw: true, reason };
  }

  return { shouldWithdraw: false };
}

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

export function recordWithdrawalDecision(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  withdrew: boolean,
  reason: string | undefined,
  currentDay: number,
): WithdrawalAIState {
  const riskScore = calculateWithdrawalRisk(aiState, horse, race, stable);
  const decision: WithdrawalDecision = {
    horseId: horse.id,
    raceId: race.id,
    stableId: stable.id,
    personality: stable.personality,
    horseAge: horse.age,
    day: currentDay,
    withdrew,
    reason,
    riskScore,
  };

  const newHistory = [...aiState.withdrawalHistory, decision];

  const trimmedHistory = trimHistory(newHistory, aiState.personalityState.memoryDepth);

  return {
    ...aiState,
    withdrawalHistory: trimmedHistory,
  };
}

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

    const contextKey = `${decision.horseAge}`;
    const success = decision.withdrew
      ? (alternativeRaceResult || 0) < (horseResult || 0)
      : (horseResult || 0) <= 3;

    const value = decision.withdrew
      ? (horseResult || 0) - (alternativeRaceResult || 0)
      : horseResult || 0;

    const newLearningState = recordLearningOutcome(
      aiState.learningState,
      "withdrawal",
      contextKey,
      success,
      value,
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    const newPersonalityState = recordPersonalityOutcome(
      aiState.personalityState,
      "withdrawal",
      { raceId: decision.raceId, horseId: decision.horseId },
      success,
      value,
      currentDay,
    );

    return {
      ...aiState,
      withdrawalHistory: newHistory,
      learningState: newLearningState,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

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
  const decisionsWithRisk = withdrawalDecisions.filter((d) => d.riskScore !== undefined);
  const avgRiskScore =
    decisionsWithRisk.length > 0
      ? decisionsWithRisk.reduce((sum, d) => sum + (d.riskScore || 0), 0) / decisionsWithRisk.length
      : 0;

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
