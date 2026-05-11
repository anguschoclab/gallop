/**
 * financial/index.ts - Financial module
 *
 * This module provides P&L tracking and reporting functionality.
 *
 * Dependencies: ./financialTypes (types and functions)
 * Related files: financialTypes.ts (provides types and functions)
 */

// Financial Module - P&L tracking and reporting

export type {
  IncomeSummary,
  ExpenseSummary,
  FinancialPeriod,
  ProfitLossReport,
  CashFlowEntry,
  CashFlowCategory,
} from "./financialTypes";

export {
  calculateNetProfit,
  createEmptyIncome,
  createEmptyExpenses,
  formatCurrency,
  formatProfitLoss,
} from "./financialTypes";
