import type { Stable } from "@/game/types";
import { recordPersonalityOutcome } from "./personalitySystem";
import type { BreedingAIState, BreedingDecision } from "./breedingAI";
import { trimHistory } from "./learningModule";

export function recordBreedingDecision(
  aiState: BreedingAIState,
  sireId: string,
  damId: string,
  sireName: string,
  damName: string,
  stableId: string,
  personality: Stable["personality"],
  day: number,
  score: number,
  tripleCrownSeries?: string,
): BreedingAIState {
  const decision: BreedingDecision = {
    sireId,
    damId,
    sireName,
    damName,
    stableId,
    personality,
    day,
    score,
    tripleCrownSeries,
  };

  const newHistory = [...aiState.breedingHistory, decision];

  const trimmedHistory = trimHistory(newHistory, aiState.personalityState.memoryDepth);

  return {
    ...aiState,
    breedingHistory: trimmedHistory,
  };
}

export function recordBreedingOutcome(
  aiState: BreedingAIState,
  sireId: string,
  damId: string,
  foalId: string,
  foalRating: number,
  success: boolean,
  currentDay: number,
  tripleCrownWin?: string,
): BreedingAIState {
  const decisionIndex = aiState.breedingHistory.findIndex(
    (d) => d.sireId === sireId && d.damId === damId && !d.outcome,
  );

  if (decisionIndex !== -1) {
    const decision = {
      ...aiState.breedingHistory[decisionIndex],
      outcome: {
        foalId,
        foalRating,
        success,
        value: foalRating,
        tripleCrownWin,
      },
    };
    const newBreedingHistory = [...aiState.breedingHistory];
    newBreedingHistory[decisionIndex] = decision;

    const newPersonalityState = recordPersonalityOutcome(
      aiState.personalityState,
      "breeding",
      { sireId, personality: decision.personality },
      success,
      foalRating,
      currentDay,
    );

    if (tripleCrownWin && decision.tripleCrownSeries) {
      const contextKey = { tripleCrownSeries: tripleCrownWin };
      const seriesSuccess = decision.tripleCrownSeries === tripleCrownWin;
      const newPersonalityStateWithSeries = recordPersonalityOutcome(
        newPersonalityState,
        "breeding",
        contextKey,
        seriesSuccess,
        foalRating,
        currentDay,
      );

      return {
        ...aiState,
        breedingHistory: newBreedingHistory,
        personalityState: newPersonalityStateWithSeries,
      };
    }

    return {
      ...aiState,
      breedingHistory: newBreedingHistory,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

export function getBreedingInsights(
  aiState: BreedingAIState,
  stableId: string,
): {
  totalDecisions: number;
  successRate: number;
  avgFoalRating: number;
  topSires: Array<{ sireId: string; sireName: string; successRate: number; count: number }>;
} {
  const stableHistory = aiState.breedingHistory.filter((d) => d.stableId === stableId && d.outcome);
  const totalDecisions = stableHistory.length;
  const successes = stableHistory.filter((d) => d.outcome?.success).length;
  const successRate = totalDecisions > 0 ? successes / totalDecisions : 0.5;
  const avgFoalRating =
    totalDecisions > 0
      ? stableHistory.reduce((sum, d) => sum + (d.outcome?.foalRating || 0), 0) / totalDecisions
      : 0;

  const sireMap: Record<string, { count: number; successes: number; name: string }> = {};
  for (const decision of stableHistory) {
    const existing = sireMap[decision.sireId] || {
      count: 0,
      successes: 0,
      name: decision.sireName,
    };
    sireMap[decision.sireId] = {
      count: existing.count + 1,
      successes: existing.successes + (decision.outcome?.success ? 1 : 0),
      name: decision.sireName,
    };
  }

  const topSires = Object.entries(sireMap)
    .map(([sireId, data]) => ({
      sireId,
      sireName: data.name,
      successRate: data.count > 0 ? data.successes / data.count : 0,
      count: data.count,
    }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  return {
    totalDecisions,
    successRate,
    avgFoalRating,
    topSires,
  };
}

export function adaptBreedingStrategy(
  aiState: BreedingAIState,
  currentDay: number,
): BreedingAIState {
  const insights = getBreedingInsights(aiState, aiState.breedingHistory[0]?.stableId || "");
  if (insights.totalDecisions > 10) {
    if (insights.successRate < 0.4) {
      return {
        ...aiState,
        personalityState: {
          ...aiState.personalityState,
          strategyConfidence: Math.max(0.3, aiState.personalityState.strategyConfidence - 0.05),
        },
      };
    } else if (insights.successRate > 0.7) {
      return {
        ...aiState,
        personalityState: {
          ...aiState.personalityState,
          strategyConfidence: Math.min(1.0, aiState.personalityState.strategyConfidence + 0.05),
        },
      };
    }
  }

  return aiState;
}
