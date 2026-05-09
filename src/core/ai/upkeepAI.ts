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
 * Create AI state for upkeep budgeting decisions
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
 * Calculate target reserve ratio based on personality
 */
function calculateTargetReserveRatio(personality: Stable["personality"]): number {
  switch (personality) {
    case "conservative":
      return 6;
    case "aggressive":
      return 2;
    case "developer":
      return 4;
    case "win-now":
      return 2.5;
    case "prestige":
      return 3.5;
    case "trader":
      return 2;
    case "specialist":
      return 3;
    case "breeder":
      return 4;
    default:
      return 3;
  }
}

/**
 * Calculate monthly expense budget
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
  // Estimate monthly expenses
  const horseCount = horses.filter((h) => h.stableId === stable.id).length;
  const basePerHorse = 500;
  const totalMonthlyExpenses = horseCount * basePerHorse;

  // Personality-based spending multiplier
  const config = aiState.personalityState;
  let spendingMultiplier = 1.0;

  if (config.personality === "aggressive") spendingMultiplier = 1.3;
  if (config.personality === "conservative") spendingMultiplier = 0.8;
  if (config.personality === "prestige") spendingMultiplier = 1.2;
  if (config.personality === "developer") spendingMultiplier = 1.1;

  const totalBudget = totalMonthlyExpenses * spendingMultiplier;

  // Calculate category budgets
  const categoryBudgets: Record<string, number> = {
    feed: totalBudget * 0.3,
    veterinary: totalBudget * 0.2,
    training: totalBudget * 0.25,
    staff: totalBudget * 0.15,
    facilities: totalBudget * 0.1,
  };

  // Personality-based category adjustments
  if (config.personality === "prestige") {
    categoryBudgets.facilities *= 1.5;
    categoryBudgets.feed *= 1.2;
  }
  if (config.personality === "developer") {
    categoryBudgets.veterinary *= 1.2;
  }
  if (config.personality === "win-now") {
    categoryBudgets.training *= 1.3;
  }

  // Reserve target
  const targetReserveRatio = calculateTargetReserveRatio(config.personality);
  const reserveTarget = totalMonthlyExpenses * targetReserveRatio;

  return {
    totalBudget,
    categoryBudgets,
    reserveTarget,
  };
}

/**
 * Determine if stable should spend on a category
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
  const config = aiState.personalityState;
  let spendingPropensity = 0.5;

  if (config.personality === "aggressive") spendingPropensity = 0.8;
  if (config.personality === "conservative") spendingPropensity = 0.4;
  if (config.personality === "prestige" && category === "facilities") spendingPropensity = 0.9;
  if (config.personality === "win-now" && category === "training") spendingPropensity = 0.9;

  // Learning-based adjustment
  const contextKey = `${config.personality}:${category}`;
  const successRate = getSuccessRate(aiState.learningState, "upkeep_spending", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 0.2;
  spendingPropensity += adaptiveBonus;

  // Budget check
  const categoryBudget = monthlyBudget.categoryBudgets[category] || 0;
  const budgetRatio = amount / (categoryBudget || 1);

  return budgetRatio <= spendingPropensity;
}

/**
 * Update reserve state
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
 * Determine if stable should conserve cash
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
  const config = aiState.personalityState;
  let buffer = 0.5;

  if (config.personality === "conservative") buffer = 1.0;
  if (config.personality === "aggressive") buffer = 0.2;

  return currentReserveRatio < targetReserveRatio + buffer;
}

/**
 * Record budget decision for learning
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
 * Get budget insights for a stable
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
