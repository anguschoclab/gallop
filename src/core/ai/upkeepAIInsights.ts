import type { Stable, Horse } from "@/game/types";
import type { UpkeepAIState, BudgetDecision } from "./upkeepAI";
import { calculateMonthlyExpenseBudget, UPKEEP_STRATEGIES } from "./upkeepAI";
import { getSuccessRate, recordLearningOutcome } from "./learningModule";
import { recordPersonalityOutcome } from "./personalitySystem";
import { DEFAULT_SUBSYSTEM_WEIGHT } from "@/constants/aiConstants";

export function calculateTargetReserveRatio(personality: Stable["personality"]): number {
  return UPKEEP_STRATEGIES[personality].targetReserveRatio;
}

export function updateReserveState(
  aiState: UpkeepAIState,
  stable: Stable,
  monthlyExpenses: number,
  currentDay: number,
): UpkeepAIState {
  const targetReserveRatio = calculateTargetReserveRatio(aiState.personalityState.personality);
  const currentReserve = stable.cash;
  const currentReserveRatio = currentReserve / (monthlyExpenses || 1);

  return {
    ...aiState,
    reserves: {
      ...aiState.reserves,
      targetReserveRatio,
      currentReserveRatio,
      lastAdjustmentDay: currentDay,
    },
  };
}

export function shouldConserveCash(
  aiState: UpkeepAIState,
  stable: Stable,
  monthlyExpenses: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
): boolean {
  if (weight <= 0) return true;

  const currentReserveRatio = stable.cash / (monthlyExpenses || 1);
  const targetReserveRatio = aiState.reserves.targetReserveRatio;

  if (currentReserveRatio < targetReserveRatio) return true;

  const strategy = UPKEEP_STRATEGIES[stable.personality];

  const effectiveThreshold = (targetReserveRatio + strategy.conserveBuffer) / weight;

  return currentReserveRatio < effectiveThreshold;
}

export function recordBudgetDecision(
  aiState: UpkeepAIState,
  totalBudget: number,
  spent: number,
  categorySpending: Record<string, number>,
  stable: Stable,
  currentDay: number,
): UpkeepAIState {
  const success = spent <= totalBudget * 1.1;
  const decision: BudgetDecision = {
    day: currentDay,
    totalBudget,
    spent,
    reserved: stable.cash - spent,
    categorySpending,
    stableId: stable.id,
    personality: stable.personality,
    success,
  };

  const newBudgetHistory = [...aiState.budgetHistory, decision];

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newBudgetHistory.length > maxHistory ? newBudgetHistory.slice(-maxHistory) : newBudgetHistory;

  const value = totalBudget - spent;
  const newPersonalityState = recordPersonalityOutcome(
    aiState.personalityState,
    "upkeep",
    { stableId: stable.id },
    success,
    value,
    currentDay,
  );
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "upkeep_spending",
    `${stable.personality}`,
    success,
    value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return {
    ...aiState,
    budgetHistory: trimmedHistory,
    learningState: newLearningState,
    personalityState: newPersonalityState,
  };
}

export function getBudgetInsights(
  aiState: UpkeepAIState,
  stableId: string,
): {
  totalBudgets: number;
  avgSpending: number;
  budgetAdherence: number;
  avgReserveRatio: number;
  targetReserveRatio: number;
} {
  const stableHistory = aiState.budgetHistory.filter((b) => b.stableId === stableId);
  const totalBudgets = stableHistory.length;
  const avgSpending =
    totalBudgets > 0 ? stableHistory.reduce((sum, b) => sum + b.spent, 0) / totalBudgets : 0;

  const successes = stableHistory.filter((b) => b.success).length;
  const budgetAdherence = totalBudgets > 0 ? successes / totalBudgets : 1;

  const avgReserveRatio = aiState.reserves.currentReserveRatio;
  const targetReserveRatio = aiState.reserves.targetReserveRatio;

  return {
    totalBudgets,
    avgSpending,
    budgetAdherence,
    avgReserveRatio,
    targetReserveRatio,
  };
}

export function identifyCostOptimizationOpportunities(
  horses: Horse[],
  dailyUpkeepPerHorse: number,
): Array<{ horseId: string; reason: string; potentialSavings: number }> {
  const opportunities: Array<{
    horseId: string;
    reason: string;
    potentialSavings: number;
  }> = [];

  for (const horse of horses) {
    if (horse.age >= 10 && (horse.form ?? 50) < 40) {
      opportunities.push({
        horseId: horse.id,
        reason: "old_low_form",
        potentialSavings: dailyUpkeepPerHorse * 365,
      });
    }

    if (horse.activeInjury && horse.activeInjury.recoveryDays > 60) {
      opportunities.push({
        horseId: horse.id,
        reason: "chronic_injury",
        potentialSavings: dailyUpkeepPerHorse * 90,
      });
    }

    if (horse.energy < 20 && horse.raceHistory && horse.raceHistory.length === 0) {
      opportunities.push({
        horseId: horse.id,
        reason: "unraced_low_energy",
        potentialSavings: dailyUpkeepPerHorse * 30,
      });
    }
  }

  return opportunities;
}

export function assessEmergencyBudget(
  stableCash: number,
  dailyUpkeep: number,
  horseCount: number,
): { isEmergency: boolean; recommendedActions: string[]; horsesToSell: number } {
  const daysOfCash = dailyUpkeep > 0 ? stableCash / dailyUpkeep : Infinity;
  const actions: string[] = [];
  let horsesToSell = 0;

  if (daysOfCash < 14) {
    return {
      isEmergency: true,
      recommendedActions: actions,
      horsesToSell,
    };
  }

  if (daysOfCash < 30) {
    actions.push("reduce_training");
    actions.push("cancel_non_essential_spending");

    if (horseCount > 10) {
      horsesToSell = Math.ceil((horseCount - 10) * 0.3);
      actions.push("sell_underperformers");
    }

    return {
      isEmergency: true,
      recommendedActions: actions,
      horsesToSell,
    };
  }

  if (daysOfCash < 60) {
    actions.push("monitor_spending");
    return {
      isEmergency: false,
      recommendedActions: actions,
      horsesToSell,
    };
  }

  return {
    isEmergency: false,
    recommendedActions: [],
    horsesToSell: 0,
  };
}
