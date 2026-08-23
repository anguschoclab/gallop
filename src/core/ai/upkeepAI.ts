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
import { createLearningState, getSuccessRate, type LearningState } from "./learningModule";

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
export const UPKEEP_STRATEGIES: Record<Stable["personality"], UpkeepStrategy> = {
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
  const horseCount = horses.filter(
    (h) => h.ownership?.type === "npc" && h.ownership.stableId === stable.id,
  ).length;
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
