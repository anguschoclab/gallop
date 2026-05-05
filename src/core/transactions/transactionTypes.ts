// Transaction Types - Cash flow tracking for stable operations

/**
 * Transaction type categories
 */
export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "adjustment";

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
 * Create a new transaction record
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
  } = {}
): Transaction {
  return {
    id: crypto.randomUUID(),
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
 * Filter transactions by type
 */
export function filterTransactionsByType(
  transactions: Transaction[],
  type: TransactionType
): Transaction[] {
  return transactions.filter((t) => t.type === type);
}

/**
 * Filter transactions by subcategory
 */
export function filterTransactionsBySubcategory(
  transactions: Transaction[],
  subcategory: TransactionSubcategory
): Transaction[] {
  return transactions.filter((t) => t.subcategory === subcategory);
}

/**
 * Filter transactions by day range
 */
export function filterTransactionsByDayRange(
  transactions: Transaction[],
  startDay: number,
  endDay: number
): Transaction[] {
  return transactions.filter((t) => t.day >= startDay && t.day <= endDay);
}

/**
 * Calculate total income from transactions
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate total expenses from transactions
 */
export function calculateTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate net cash flow (income - expenses)
 */
export function calculateNetCashFlow(transactions: Transaction[]): number {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
}

/**
 * Group transactions by subcategory
 */
export function groupTransactionsBySubcategory(
  transactions: Transaction[]
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
 * Format transaction type for display
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
 * Format transaction subcategory for display
 */
export function formatTransactionSubcategory(
  subcategory: TransactionSubcategory
): string {
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
