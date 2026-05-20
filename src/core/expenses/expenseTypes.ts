/**
 * expenseTypes.ts - Expense type definitions and functions
 *
 * This file provides type definitions for expense categories, expense records,
 * expense summaries, and configuration. It also includes helper functions for
 * creating, grouping, and filtering expenses.
 *
 * Dependencies: None (self-contained types and functions)
 * Related files: index.ts (re-exports types and functions)
 */

// Expense Types - Categorized expense tracking for stable operations

import { generateUUID } from "@/core/uuid";

/**
 * Expense category types
 */
export type ExpenseCategory =
  | "upkeep"
  | "training"
  | "veterinary"
  | "farrier"
  | "transport"
  | "insurance"
  | "entry_fees"
  | "jockey_fees"
  | "breeding"
  | "purchases"
  | "facility_maintenance"
  | "other";

/**
 * Expense record for tracking individual expenses
 */
export interface Expense {
  id: string;
  day: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  horseId?: string;
  raceId?: string;
  /** Whether this is a recurring daily expense */
  recurring: boolean;
}

/**
 * Expense summary by category
 */
export interface ExpenseByCategory {
  category: ExpenseCategory;
  amount: number;
  count: number;
}

/**
 * Expense configuration with default costs
 */
export interface ExpenseConfig {
  /** Daily upkeep per horse */
  dailyUpkeep: number;
  /** Training session cost */
  trainingCost: number;
  /** Race entry fee (base, varies by race) */
  baseEntryFee: number;
  /** Breeding/covering fee */
  breedingFee: number;
  /** Veterinary visit cost */
  veterinaryVisit: number;
  /** Farrier service cost */
  farrierService: number;
  /** Transport per distance unit */
  transportPerDistance: number;
  /** Insurance premium per horse */
  insurancePremium: number;
}

/**
 * Default expense configuration
 */
export const DEFAULT_EXPENSE_CONFIG: ExpenseConfig = {
  dailyUpkeep: 50,
  trainingCost: 75,
  baseEntryFee: 100,
  breedingFee: 2000,
  veterinaryVisit: 500,
  farrierService: 150,
  transportPerDistance: 2,
  insurancePremium: 25,
};

/**
 * Category display info
 */
export interface CategoryDisplay {
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Expense category display mapping
 */
export const CATEGORY_DISPLAY: Record<ExpenseCategory, CategoryDisplay> = {
  upkeep: {
    label: "Daily Upkeep",
    icon: "🏠",
    color: "text-info",
    description: "Daily care and maintenance for each horse",
  },
  training: {
    label: "Training",
    icon: "🏃",
    color: "text-success",
    description: "Training sessions and workout costs",
  },
  veterinary: {
    label: "Veterinary",
    icon: "🩺",
    color: "text-destructive",
    description: "Medical care and health services",
  },
  farrier: {
    label: "Farrier",
    icon: "🔧",
    color: "text-warning",
    description: "Hoof care and shoeing services",
  },
  transport: {
    icon: "🚛",
    color: "text-fame",
    label: "Transport",
    description: "Travel and shipping costs",
  },
  insurance: {
    label: "Insurance",
    icon: "🛡️",
    color: "text-info",
    description: "Insurance premiums and coverage",
  },
  entry_fees: {
    label: "Entry Fees",
    icon: "🎫",
    color: "text-warning",
    description: "Race entry fees",
  },
  jockey_fees: {
    label: "Jockey Fees",
    icon: "👤",
    color: "text-fame",
    description: "Jockey riding fees",
  },
  breeding: {
    label: "Breeding",
    icon: "🐴",
    color: "text-destructive",
    description: "Breeding and covering fees",
  },
  purchases: {
    label: "Horse Purchases",
    icon: "💰",
    color: "text-success",
    description: "Horse acquisition costs",
  },
  facility_maintenance: {
    label: "Facility Maintenance",
    icon: "🏗️",
    color: "text-muted-foreground",
    description: "Facility upkeep and repairs",
  },
  other: {
    label: "Other",
    icon: "📋",
    color: "text-muted-foreground",
    description: "Miscellaneous expenses",
  },
};

/**
 * Create a new expense record.
 *
 * Creates an expense object with a unique ID, category, amount, description,
 * and optional horse/race associations.
 *
 * @param category - The expense category
 * @param amount - The expense amount
 * @param description - Description of the expense
 * @param day - The game day the expense occurred
 * @param options - Optional parameters
 * @param options.horseId - Optional horse associated with expense
 * @param options.raceId - Optional race associated with expense
 * @param options.recurring - Whether this is a recurring daily expense
 * @returns New expense record
 */
export function createExpense(
  category: ExpenseCategory,
  amount: number,
  description: string,
  day: number,
  options: {
    horseId?: string;
    raceId?: string;
    recurring?: boolean;
  } = {},
): Expense {
  return {
    id: generateUUID(),
    day,
    category,
    amount,
    description,
    horseId: options.horseId,
    raceId: options.raceId,
    recurring: options.recurring ?? false,
  };
}

/**
 * Group expenses by category.
 *
 * Aggregates expenses by category, calculating total amount and count per category.
 *
 * @param expenses - Array of expenses to group
 * @returns Array of expenses grouped by category with totals
 */
export function groupExpensesByCategory(expenses: Expense[]): ExpenseByCategory[] {
  const grouped = new Map<ExpenseCategory, { amount: number; count: number }>();

  for (const expense of expenses) {
    const existing = grouped.get(expense.category) ?? { amount: 0, count: 0 };
    grouped.set(expense.category, {
      amount: existing.amount + expense.amount,
      count: existing.count + 1,
    });
  }

  return Array.from(grouped.entries()).map(([category, { amount, count }]) => ({
    category,
    amount,
    count,
  }));
}

/**
 * Filter expenses by day range.
 *
 * Returns expenses that occurred within the specified day range (inclusive).
 *
 * @param expenses - Array of expenses to filter
 * @param startDay - Start day of the range
 * @param endDay - End day of the range
 * @returns Filtered expenses within the day range
 */
export function filterExpensesByDayRange(
  expenses: Expense[],
  startDay: number,
  endDay: number,
): Expense[] {
  return expenses.filter((e) => e.day >= startDay && e.day <= endDay);
}

/**
 * Calculate total expenses for a category.
 *
 * Sums all expenses that match the specified category.
 *
 * @param expenses - Array of expenses
 * @param category - The category to sum
 * @returns Total amount for the category
 */
export function calculateCategoryTotal(expenses: Expense[], category: ExpenseCategory): number {
  return expenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0);
}
