/**
 * expenses/index.ts - Expenses module
 *
 * This module provides categorized expense tracking and reporting.
 *
 * Dependencies: ./expenseTypes (types and functions)
 * Related files: expenseTypes.ts (provides types and functions)
 */

// Expenses Module - Categorized expense tracking

export type { Expense, ExpenseByCategory, ExpenseConfig, CategoryDisplay } from "./expenseTypes";

export type { ExpenseCategory } from "./expenseTypes";

export {
  DEFAULT_EXPENSE_CONFIG,
  CATEGORY_DISPLAY,
  createExpense,
  groupExpensesByCategory,
  filterExpensesByDayRange,
  calculateCategoryTotal,
} from "./expenseTypes";
