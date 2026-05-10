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
import { getPersonalityAIState } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";

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
    categoryAdjustments: (b) => { b.veterinary *= 1.2; },
    baseSpendingPropensity: 0.5,
    conserveBuffer: 0.5,
  },
  "win-now": {
    targetReserveRatio: 2.5,
    spendingMultiplier: 1.0,
    categoryAdjustments: (b) => { b.training *= 1.3; },
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
 * @param currentDay - Current game day
 * @returns True if stable should spend on the category
 */
export function shouldSpendOnCategory(
  aiState: UpkeepAIState,
  category: string,
  amount: number,
  stable: Stable,
  currentDay: number,
): boolean {
  // Basic cash check
  const monthlyBudget = calculateMonthlyExpenseBudget(aiState, stable, [], currentDay);
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
 * @returns True if stable should conserve cash
 */
export function shouldConserveCash(
  aiState: UpkeepAIState,
  stable: Stable,
  monthlyExpenses: number,
): boolean {
  const currentReserveRatio = stable.cash / (monthlyExpenses || 1);
  const targetReserveRatio = aiState.reserves.targetReserveRatio;

  // Conserve if below target
  if (currentReserveRatio < targetReserveRatio) return true;

  // Personality-based buffer
  const strategy = UPKEEP_STRATEGIES[stable.personality];

  return currentReserveRatio < targetReserveRatio + strategy.conserveBuffer;
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
  const decision: BudgetDecision = {
    day: currentDay,
    totalBudget,
    spent,
    reserved: stable.cash - spent,
    categorySpending,
    stableId: stable.id,
    personality: stable.personality,
  };

  const newBudgetHistory = [...aiState.budgetHistory, decision];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newBudgetHistory.length > maxHistory ? newBudgetHistory.slice(-maxHistory) : newBudgetHistory;

  // Update learning state
  const success = spent <= totalBudget * 1.1;
  const value = totalBudget - spent;
  const newLearningState = recordOutcome(
    aiState.learningState,
    "upkeep_spending",
    "budget",
    success,
    value,
    Date.now(),
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return {
    ...aiState,
    budgetHistory: trimmedHistory,
    learningState: newLearningState,
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
