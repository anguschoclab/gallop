/**
 * reportBuilder.ts - Financial report generation
 *
 * Aggregates transactions into Profit & Loss periods (week, month, year, all-time).
 */

import type { Transaction, TransactionSubcategory } from "@/core/transactions/transactionTypes";
import {
  createEmptyIncome,
  createEmptyExpenses,
  type FinancialPeriod,
  type ProfitLossReport,
  type IncomeSummary,
  type ExpenseSummary,
} from "./financialTypes";

/**
 * Aggregates transactions into a single financial period.
 * @param transactions - Array of transactions to aggregate
 * @param startDay - Starting day of the period
 * @param endDay - Ending day of the period
 * @param label - Label for the period
 * @param startingCash - Starting cash balance (default 0)
 * @returns Financial period with income, expenses, and profit/loss
 */
export function buildFinancialPeriod(
  transactions: Transaction[],
  startDay: number,
  endDay: number,
  label: string,
  startingCash: number = 0,
): FinancialPeriod {
  const periodTransactions = transactions.filter((t) => t.day >= startDay && t.day <= endDay);

  const income = createEmptyIncome();
  const expenses = createEmptyExpenses();

  for (const t of periodTransactions) {
    if (t.type === "income") {
      const amount = Math.abs(t.amount);
      income.total += amount;

      switch (t.subcategory) {
        case "prize_money":
          income.prizeMoney += amount;
          break;
        case "claiming_sale":
          income.claimingSales += amount;
          break;
        case "auction_sale":
          income.auctionSales += amount;
          break;
        case "private_sale":
          income.privateSales += amount;
          break;
        case "stud_fee":
          income.studFees += amount;
          break;
      }
    } else if (t.type === "expense") {
      const amount = Math.abs(t.amount);
      expenses.total += amount;

      switch (t.subcategory) {
        case "upkeep":
          expenses.upkeep += amount;
          break;
        case "training":
          expenses.training += amount;
          break;
        case "entry_fee":
          expenses.entryFees += amount;
          break;
        case "jockey_fee":
          expenses.jockeyFees += amount;
          break;
        case "horse_purchase":
          expenses.horsePurchases += amount;
          break;
        case "breeding_fee":
          expenses.breedingFees += amount;
          break;
        case "transport":
          expenses.transport += amount;
          break;
        case "veterinary":
          expenses.veterinary += amount;
          break;
        case "farrier":
          expenses.farrier += amount;
          break;
        case "insurance":
          expenses.insurance += amount;
          break;
        case "facility_maintenance":
          expenses.facilityMaintenance += amount;
          break;
      }
    }
  }

  const netProfit = income.total - expenses.total;
  // Approximation of ending cash for the period if we knew the starting cash
  const endingCash = startingCash + netProfit;

  return {
    startDay,
    endDay,
    label,
    income,
    expenses,
    netProfit,
    startingCash,
    endingCash,
  };
}

/**
 * Builds a full Profit & Loss report across various time horizons.
 * @param transactions - Array of all transactions
 * @param currentDay - Current game day
 * @returns Profit & Loss report with weekly, monthly, yearly, and all-time periods
 */
export function buildProfitLossReport(
  transactions: Transaction[],
  currentDay: number,
): ProfitLossReport {
  return {
    generatedDay: currentDay,
    currentWeek: buildFinancialPeriod(
      transactions,
      Math.max(1, currentDay - 6),
      currentDay,
      "Last 7 Days",
    ),
    currentMonth: buildFinancialPeriod(
      transactions,
      Math.max(1, currentDay - 29),
      currentDay,
      "Last 30 Days",
    ),
    currentYear: buildFinancialPeriod(
      transactions,
      Math.max(1, currentDay - 364),
      currentDay,
      "Last Year",
    ),
    allTime: buildFinancialPeriod(transactions, 1, currentDay, "All Time"),
    weeklyHistory: [], // To be expanded in Phase 2
  };
}
