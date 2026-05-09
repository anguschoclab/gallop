/**
 * transactions/index.ts - Transactions module
 *
 * This module provides cash flow tracking functionality.
 *
 * Dependencies: ./transactionTypes (types and functions)
 * Related files: transactionTypes.ts (provides types and functions)
 */

// Transactions Module - Cash flow tracking

export type { Transaction, TransactionType, TransactionSubcategory } from "./transactionTypes";

export {
  createTransaction,
  filterTransactionsByType,
  filterTransactionsBySubcategory,
  filterTransactionsByDayRange,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  groupTransactionsBySubcategory,
  formatTransactionType,
  formatTransactionSubcategory,
} from "./transactionTypes";
