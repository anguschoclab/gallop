/**
 * upkeepAI.ts - Upkeep budgeting AI system
 *
 * This file provides strategic cost management, cash reserves, and learning
 * from budgeting decisions for NPC stables.
 *
 * Dependencies: @/game/types (Stable, Horse), ./personalitySystem (getPersonalityAIState), ./learningModule (learning functions)
 * Related files: npcCycleAI.ts (uses upkeep AI), personalitySystem.ts (provides personality state)
 */

/**
 * Upkeep Budgeting AI System
 * Strategic cost management, cash reserves, learning from budgeting decisions
 */

import type { Stable, Horse } from "@/game/types";
import { getPersonalityAIState, recordOutcome } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome as recordLearningOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";
import { DEFAULT_SUBSYSTEM_WEIGHT } from "./subsystemWeightConstants";

export interface UpkeepAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  budgetHistory: BudgetDecision[];
  reserves: ReserveState;
}

export interface BudgetDecision {
  day: number;
  totalBudget: number;
  spent: number;
  reserved: number;
  categorySpending: Record<string, number>;
  stableId: string;
  personality: Stable["personality"];
  success?: boolean;
}

export interface ReserveState {
  targetReserveRatio: number; // Target cash reserve as ratio of monthly expenses
  currentReserveRatio: number;
  lastAdjustmentDay: number;
}

/**
 * Create AI state for upkeep budgeting decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * budget history, and reserve state.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized upkeep AI state
 */
export function createUpkeepAIState(stable: Stable): UpkeepAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    budgetHistory: [],
    reserves: {
      targetReserveRatio: 3, // Default: 3 months of expenses
      currentReserveRatio: 0,
      lastAdjustmentDay: 0,
    },
  };
}

/**
 * Configuration for personality-driven upkeep strategy.
 */
interface UpkeepStrategy {
  targetReserveRatio: number;
  spendingMultiplier: number;
  categoryAdjustments?: (budgets: Record<string, number>) => void;
  baseSpendingPropensity: number;
  categoryPropensity?: Record<string, number>;
  conserveBuffer: number;
}

/**
 * Registry of upkeep strategies indexed by stable personality.
 */
const UPKEEP_STRATEGIES: Record<Stable["personality"], UpkeepStrategy> = {
  conservative: {
    targetReserveRatio: 6,
    spendingMultiplier: 0.8,
    baseSpendingPropensity: 0.4,
    conserveBuffer: 1.0,
  },
  aggressive: {
    targetReserveRatio: 2,
    spendingMultiplier: 1.3,
    baseSpendingPropensity: 0.8,
    conserveBuffer: 0.2,
  },
  developer: {
    targetReserveRatio: 4,
    spendingMultiplier: 1.1,
    categoryAdjustments: (b) => {
      b.veterinary *= 1.2;
    },
    baseSpendingPropensity: 0.5,
    conserveBuffer: 0.5,
  },
  "win-now": {
    targetReserveRatio: 2.5,
    spendingMultiplier: 1.0,
    categoryAdjustments: (b) => {
      b.training *= 1.3;
    },
    baseSpendingPropensity: 0.5,
    categoryPropensity: { training: 0.9 },
    conserveBuffer: 0.5,
  },
  prestige: {
    targetReserveRatio: 3.5,
    spendingMultiplier: 1.2,
    categoryAdjustments: (b) => {
      b.facilities *= 1.5;
      b.feed *= 1.2;
    },
    baseSpendingPropensity: 0.5,
    categoryPropensity: { facilities: 0.9 },
    conserveBuffer: 0.5,
  },
  trader: {
    targetReserveRatio: 2,
    spendingMultiplier: 1.0,
    baseSpendingPropensity: 0.5,
    conserveBuffer: 0.5,
  },
  specialist: {
    targetReserveRatio: 3,
    spendingMultiplier: 1.0,
    baseSpendingPropensity: 0.5,
    conserveBuffer: 0.5,
  },
  breeder: {
    targetReserveRatio: 4,
    spendingMultiplier: 1.0,
    baseSpendingPropensity: 0.5,
    conserveBuffer: 0.5,
  },
};

/**
 * Calculate target reserve ratio based on personality.
 *
 * Returns the target reserve ratio (months of expenses to keep in reserve)
 * based on personality.
 *
 * @param personality - The stable personality
 * @returns Target reserve ratio in months
 */
function calculateTargetReserveRatio(personality: Stable["personality"]): number {
  return UPKEEP_STRATEGIES[personality].targetReserveRatio;
}

/**
 * Calculate monthly expense budget.
 *
 * Calculates total budget, category budgets, and reserve target
 * based on personality and horse count.
 *
 * @param aiState - Current upkeep AI state
 * @param stable - The stable to budget for
 * @param horses - List of horses in the stable
 * @param currentDay - Current game day
 * @returns Object with total budget, category budgets, and reserve target
 */
export function calculateMonthlyExpenseBudget(
  aiState: UpkeepAIState,
  stable: Stable,
  horses: Horse[],
  currentDay: number,
): {
  totalBudget: number;
  categoryBudgets: Record<string, number>;
  reserveTarget: number;
} {
  const strategy = UPKEEP_STRATEGIES[stable.personality];

  // Estimate monthly expenses
  const horseCount = horses.filter((h) => h.stableId === stable.id).length;
  const basePerHorse = 500;
  const totalMonthlyExpenses = horseCount * basePerHorse;

  // Personality-based spending multiplier
  const totalBudget = totalMonthlyExpenses * strategy.spendingMultiplier;

  // Calculate category budgets
  const categoryBudgets: Record<string, number> = {
    feed: totalBudget * 0.3,
    veterinary: totalBudget * 0.2,
    training: totalBudget * 0.25,
    staff: totalBudget * 0.15,
    facilities: totalBudget * 0.1,
  };

  // Personality-based category adjustments
  strategy.categoryAdjustments?.(categoryBudgets);

  // Reserve target
  const reserveTarget = totalMonthlyExpenses * strategy.targetReserveRatio;

  return {
    totalBudget,
    categoryBudgets,
    reserveTarget,
  };
}

/**
 * Determine if stable should spend on a category.
 *
 * Evaluates spending decisions based on cash reserves, personality
 * spending propensity, learning-based adjustments, and budget constraints.
 *
 * @param aiState - Current upkeep AI state
 * @param category - The spending category
 * @param amount - The amount to spend
 * @param stable - The stable making the decision
 * @param horses
 * @param currentDay - Current game day
 * @returns True if stable should spend on the category
 */
export function shouldSpendOnCategory(
  aiState: UpkeepAIState,
  category: string,
  amount: number,
  stable: Stable,
  horses: Horse[],
  currentDay: number,
): boolean {
  // Basic cash check
  const monthlyBudget = calculateMonthlyExpenseBudget(aiState, stable, horses, currentDay);
  if (stable.cash < monthlyBudget.reserveTarget) {
    return false;
  }

  // Personality-based spending propensity
  const strategy = UPKEEP_STRATEGIES[stable.personality];
  let spendingPropensity =
    strategy.categoryPropensity?.[category] ?? strategy.baseSpendingPropensity;

  // Learning-based adjustment
  const contextKey = `${stable.personality}:${category}`;
  const successRate = getSuccessRate(aiState.learningState, "upkeep_spending", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 0.2;
  spendingPropensity += adaptiveBonus;

  // Budget check
  const categoryBudget = monthlyBudget.categoryBudgets[category] || 0;
  const budgetRatio = amount / (categoryBudget || 1);

  return budgetRatio <= spendingPropensity;
}

/**
 * Update reserve state.
 *
 * Updates the reserve state with current reserve ratio,
 * target reserve ratio, and last adjustment day.
 *
 * @param aiState - Current upkeep AI state
 * @param stable - The stable to update reserves for
 * @param monthlyExpenses - Monthly expense amount
 * @param currentDay - Current game day
 * @returns Updated upkeep AI state
 */
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

/**
 * Determine if stable should conserve cash.
 *
 * Evaluates cash conservation based on reserve ratio, target ratio,
 * and personality-based buffer.
 *
 * @param aiState - Current upkeep AI state
 * @param stable - The stable to evaluate
 * @param monthlyExpenses - Monthly expense amount
 * @param weight - Subsystem weight that modulates conservation tendency (default 1.0)
 * @returns True if stable should conserve cash
 */
export function shouldConserveCash(
  aiState: UpkeepAIState,
  stable: Stable,
  monthlyExpenses: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
): boolean {
  // Weight ≤ 0 → always conserve (max conservation)
  if (weight <= 0) return true;

  const currentReserveRatio = stable.cash / (monthlyExpenses || 1);
  const targetReserveRatio = aiState.reserves.targetReserveRatio;

  // Conserve if below target
  if (currentReserveRatio < targetReserveRatio) return true;

  // Personality-based buffer
  const strategy = UPKEEP_STRATEGIES[stable.personality];

  // Weight modulates: higher weight → higher threshold → less likely to conserve
  const effectiveThreshold = (targetReserveRatio + strategy.conserveBuffer) / weight;

  return currentReserveRatio < effectiveThreshold;
}

/**
 * Record budget decision for learning.
 *
 * Records the budget decision in history and updates the
 * learning state for adaptive improvement.
 *
 * @param aiState - Current upkeep AI state
 * @param totalBudget - Total budget for the period
 * @param spent - Amount actually spent
 * @param categorySpending - Spending by category
 * @param stable - The stable making the budget
 * @param currentDay - Current game day
 * @returns Updated upkeep AI state
 */
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

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newBudgetHistory.length > maxHistory ? newBudgetHistory.slice(-maxHistory) : newBudgetHistory;

  // Update learning state
  const value = totalBudget - spent;
  const newPersonalityState = recordOutcome(
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

/**
 * Get budget insights for a stable.
 *
 * Calculates budget statistics including total budgets, average spending,
 * budget adherence, and reserve ratios.
 *
 * @param aiState - Current upkeep AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with budget statistics
 */
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

// ─── Cost Optimization ───────────────────────────────────────────────────────

/**
 * Identify cost optimization opportunities for a stable.
 *
 * Analyzes horse roster to find underperforming horses consuming resources
 * without generating value. Recommends trimming or repositioning.
 *
 * @param horses - Array of horses in the stable
 * @param dailyUpkeepPerHorse - Daily upkeep cost per horse
 * @returns Array of cost optimization recommendations
 */
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
    // Old horses with low rating: retirement candidate
    if (horse.age >= 10 && (horse.form ?? 50) < 40) {
      opportunities.push({
        horseId: horse.id,
        reason: "old_low_form",
        potentialSavings: dailyUpkeepPerHorse * 365,
      });
    }

    // Chronically injured horses
    if (horse.activeInjury && horse.activeInjury.recoveryDays > 60) {
      opportunities.push({
        horseId: horse.id,
        reason: "chronic_injury",
        potentialSavings: dailyUpkeepPerHorse * 90,
      });
    }

    // Horses with very low energy that haven't raced recently
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

// ─── Emergency Budgeting ─────────────────────────────────────────────────────

/**
 * Determine if a stable needs emergency budget cuts.
 *
 * If cash reserves fall below a critical threshold relative to daily upkeep,
 * recommend cutting non-essential spending and potentially selling horses.
 *
 * @param stableCash - Current cash on hand
 * @param dailyUpkeep - Total daily upkeep cost
 * @param horseCount - Number of horses in the stable
 * @returns Emergency budget recommendation
 */
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
