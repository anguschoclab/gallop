// Financial Types - Profit & Loss tracking for stable management

/**
 * Income categories for racing operations
 */
export interface IncomeSummary {
  /** Prize money from race wins/placings */
  prizeMoney: number;
  /** Claiming sales (horses sold via claiming) */
  claimingSales: number;
  /** Auction sales (horses sold at auction) */
  auctionSales: number;
  /** Private sales (horses sold to market/NPCs) */
  privateSales: number;
  /** Stud fees (if player has stallions at stud) */
  studFees: number;
  /** Total income */
  total: number;
}

/**
 * Expense categories for stable operations
 */
export interface ExpenseSummary {
  /** Daily upkeep per horse */
  upkeep: number;
  /** Training costs */
  training: number;
  /** Entry fees for races */
  entryFees: number;
  /** Jockey riding fees */
  jockeyFees: number;
  /** Horse purchases (market, auction, claiming) */
  horsePurchases: number;
  /** Breeding fees (covering fees) */
  breedingFees: number;
  /** Transport/travel costs */
  transport: number;
  /** Veterinary care */
  veterinary: number;
  /** Farrier services */
  farrier: number;
  /** Insurance (future feature) */
  insurance: number;
  /** Facility maintenance */
  facilityMaintenance: number;
  /** Total expenses */
  total: number;
}

/**
 * Period summary for P&L reporting
 */
export interface FinancialPeriod {
  /** Period start day */
  startDay: number;
  /** Period end day */
  endDay: number;
  /** Period label (e.g., "Week 1", "March 2024") */
  label: string;
  /** Income breakdown */
  income: IncomeSummary;
  /** Expense breakdown */
  expenses: ExpenseSummary;
  /** Net profit/loss */
  netProfit: number;
  /** Starting cash for period */
  startingCash: number;
  /** Ending cash for period */
  endingCash: number;
}

/**
 * Complete P&L Report
 */
export interface ProfitLossReport {
  /** Report generation day */
  generatedDay: number;
  /** Current period (last 7 days) */
  currentWeek: FinancialPeriod;
  /** Monthly summary */
  currentMonth: FinancialPeriod;
  /** Yearly summary */
  currentYear: FinancialPeriod;
  /** All-time summary */
  allTime: FinancialPeriod;
  /** Historical weekly data for charts */
  weeklyHistory: FinancialPeriod[];
}

/**
 * Cash flow entry for transaction log
 */
export interface CashFlowEntry {
  id: string;
  day: number;
  amount: number;
  category: CashFlowCategory;
  subcategory: string;
  description: string;
  horseId?: string;
  raceId?: string;
  balanceAfter: number;
}

/**
 * Cash flow categories
 */
export type CashFlowCategory =
  | "income"
  | "expense"
  | "transfer"
  | "adjustment";

/**
 * Calculate net profit from income and expenses
 */
export function calculateNetProfit(
  income: IncomeSummary,
  expenses: ExpenseSummary
): number {
  return income.total - expenses.total;
}

/**
 * Create an empty income summary
 */
export function createEmptyIncome(): IncomeSummary {
  return {
    prizeMoney: 0,
    claimingSales: 0,
    auctionSales: 0,
    privateSales: 0,
    studFees: 0,
    total: 0,
  };
}

/**
 * Create an empty expense summary
 */
export function createEmptyExpenses(): ExpenseSummary {
  return {
    upkeep: 0,
    training: 0,
    entryFees: 0,
    jockeyFees: 0,
    horsePurchases: 0,
    breedingFees: 0,
    transport: 0,
    veterinary: 0,
    farrier: 0,
    insurance: 0,
    facilityMaintenance: 0,
    total: 0,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);

  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format profit/loss with sign
 */
export function formatProfitLoss(amount: number): string {
  const formatted = formatCurrency(amount);
  if (amount > 0) return `+${formatted}`;
  return formatted;
}
