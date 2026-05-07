// Expense Types - Categorized expense tracking for stable operations

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
 * Create a new expense record
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
    id: crypto.randomUUID(),
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
 * Group expenses by category
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
 * Filter expenses by day range
 */
export function filterExpensesByDayRange(
  expenses: Expense[],
  startDay: number,
  endDay: number,
): Expense[] {
  return expenses.filter((e) => e.day >= startDay && e.day <= endDay);
}

/**
 * Calculate total expenses for a category
 */
export function calculateCategoryTotal(expenses: Expense[], category: ExpenseCategory): number {
  return expenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0);
}
