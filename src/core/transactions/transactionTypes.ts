// Transaction Types - Cash flow tracking for stable operations
import { generateUUIDWithValidation } from "../uuid";

/**
 * Transaction type categories
 */
export type TransactionType = "income" | "expense" | "transfer" | "adjustment";

/**
 * Transaction subcategories for detailed tracking
 */
export type TransactionSubcategory =
  // Income subcategories
  | "prize_money"
  | "claiming_sale"
  | "auction_sale"
  | "private_sale"
  | "stud_fee"
  | "other_income"
  // Expense subcategories
  | "upkeep"
  | "training"
  | "veterinary"
  | "farrier"
  | "transport"
  | "insurance"
  | "entry_fee"
  | "jockey_fee"
  | "breeding_fee"
  | "horse_purchase"
  | "facility_maintenance"
  | "other_expense"
  // Transfer subcategories
  | "player_deposit"
  | "player_withdrawal"
  // Adjustment subcategories
  | "correction"
  | "refund"
  | "penalty";

/**
 * Transaction record for tracking cash movements
 */
export interface Transaction {
  id: string;
  day: number;
  type: TransactionType;
  subcategory: TransactionSubcategory;
  amount: number;
  description: string;
  balanceAfter: number;
  horseId?: string;
  raceId?: string;
  /** Whether this is a recurring transaction (e.g., daily upkeep) */
  recurring: boolean;
}

/**
 * Create a new transaction record.
 *
 * @param type - Transaction category (income, expense, etc.)
 * @param subcategory - Specific subcategory for tracking
 * @param amount - Transaction amount in dollars
 * @param description - Human-readable description
 * @param day - Game day the transaction occurred
 * @param balanceAfter - Running balance after this transaction
 * @param options - Optional metadata
 * @param options.horseId - Optional horse associated with transaction
 * @param options.raceId - Optional race associated with transaction
 * @param options.recurring - Whether this is a repeating daily transaction
 * @returns Complete Transaction object
 */
export function createTransaction(
  type: TransactionType,
  subcategory: TransactionSubcategory,
  amount: number,
  description: string,
  day: number,
  balanceAfter: number,
  options: {
    horseId?: string;
    raceId?: string;
    recurring?: boolean;
  } = {},
): Transaction {
  return {
    id: generateUUID(),
    day,
    type,
    subcategory,
    amount,
    description,
    balanceAfter,
    horseId: options.horseId,
    raceId: options.raceId,
    recurring: options.recurring ?? false,
  };
}

/**
 * Filter transactions by type.
 *
 * @param transactions - Array of transactions to filter
 * @param type - Target transaction type
 * @returns Filtered array of transactions
 */
export function filterTransactionsByType(
  transactions: Transaction[],
  type: TransactionType,
): Transaction[] {
  return transactions.filter((t) => t.type === type);
}

/**
 * Filter transactions by subcategory.
 *
 * @param transactions - Array of transactions to filter
 * @param subcategory - Target subcategory
 * @returns Filtered array of transactions
 */
export function filterTransactionsBySubcategory(
  transactions: Transaction[],
  subcategory: TransactionSubcategory,
): Transaction[] {
  return transactions.filter((t) => t.subcategory === subcategory);
}

/**
 * Filter transactions by day range.
 *
 * @param transactions - Array of transactions to filter
 * @param startDay - Starting day (inclusive)
 * @param endDay - Ending day (inclusive)
 * @returns Filtered array of transactions
 */
export function filterTransactionsByDayRange(
  transactions: Transaction[],
  startDay: number,
  endDay: number,
): Transaction[] {
  return transactions.filter((t) => t.day >= startDay && t.day <= endDay);
}

/**
 * Calculate total income from transactions.
 *
 * @param transactions - Array of transactions to sum
 * @returns Total income amount
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate total expenses from transactions.
 *
 * @param transactions - Array of transactions to sum
 * @returns Total expense amount (positive number)
 */
export function calculateTotalExpenses(transactions: Transaction[]): number {
  return transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate net cash flow (income - expenses).
 *
 * @param transactions - Array of transactions to calculate for
 * @returns Net cash flow amount
 */
export function calculateNetCashFlow(transactions: Transaction[]): number {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
}

/**
 * Group transactions by subcategory.
 *
 * @param transactions - Array of transactions to group
 * @returns Map of subcategories to count and total amount
 */
export function groupTransactionsBySubcategory(
  transactions: Transaction[],
): Map<TransactionSubcategory, { count: number; total: number }> {
  const grouped = new Map<TransactionSubcategory, { count: number; total: number }>();

  for (const transaction of transactions) {
    const existing = grouped.get(transaction.subcategory) ?? { count: 0, total: 0 };
    grouped.set(transaction.subcategory, {
      count: existing.count + 1,
      total: existing.total + transaction.amount,
    });
  }

  return grouped;
}

/**
 * Format transaction type for display.
 *
 * @param type - Transaction type to format
 * @returns Human-readable label
 */
export function formatTransactionType(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    adjustment: "Adjustment",
  };
  return labels[type];
}

/**
 * Format transaction subcategory for display.
 *
 * @param subcategory - Subcategory to format
 * @returns Human-readable label
 */
export function formatTransactionSubcategory(subcategory: TransactionSubcategory): string {
  const labels: Record<TransactionSubcategory, string> = {
    // Income
    prize_money: "Prize Money",
    claiming_sale: "Claiming Sale",
    auction_sale: "Auction Sale",
    private_sale: "Private Sale",
    stud_fee: "Stud Fee",
    other_income: "Other Income",
    // Expense
    upkeep: "Daily Upkeep",
    training: "Training",
    veterinary: "Veterinary",
    farrier: "Farrier",
    transport: "Transport",
    insurance: "Insurance",
    entry_fee: "Entry Fee",
    jockey_fee: "Jockey Fee",
    breeding_fee: "Breeding Fee",
    horse_purchase: "Horse Purchase",
    facility_maintenance: "Facility Maintenance",
    other_expense: "Other Expense",
    // Transfer
    player_deposit: "Player Deposit",
    player_withdrawal: "Player Withdrawal",
    // Adjustment
    correction: "Correction",
    refund: "Refund",
    penalty: "Penalty",
  };
  return labels[subcategory];
}
