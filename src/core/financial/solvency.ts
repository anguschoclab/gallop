/**
 * core/financial/solvency.ts - Player solvency model.
 *
 * Pure functions used by the solvency pipeline phase to classify the player's
 * financial position, decide when creditors act, and pick a horse for a
 * distressed sale.
 */

export const SOLVENCY_THRESHOLDS = {
  /** Cash at or below this, sustained, triggers a creditor sale. */
  forcedSaleCash: -25_000,
  /** Consecutive days below forcedSaleCash before creditors act. */
  forcedSaleDays: 7,
  /** Hard floor — the run ends. */
  insolventCash: -100_000,
  /** Fraction of market value a distressed sale realises. */
  distressSaleRate: 0.7,
  /** Daily interest applied to negative balances. */
  dailyInterestRate: 0.001,
} as const;

export type SolvencyTier = "healthy" | "warning" | "forced_sale" | "insolvent";

export interface SolvencyInput {
  cash: number;
  consecutiveDaysInDebt: number;
}

export interface SolvencyState {
  tier: SolvencyTier;
  /** Cash needed to get back to zero; 0 when healthy. */
  cashToRecover: number;
}

/** Classify the player's financial position into an escalation tier. */
export function deriveSolvencyState(input: SolvencyInput): SolvencyState {
  const cashToRecover = input.cash < 0 ? Math.abs(input.cash) : 0;

  if (input.cash <= SOLVENCY_THRESHOLDS.insolventCash) {
    return { tier: "insolvent", cashToRecover };
  }
  if (
    input.cash <= SOLVENCY_THRESHOLDS.forcedSaleCash &&
    input.consecutiveDaysInDebt >= SOLVENCY_THRESHOLDS.forcedSaleDays
  ) {
    return { tier: "forced_sale", cashToRecover };
  }
  if (input.cash < 0) {
    return { tier: "warning", cashToRecover };
  }
  return { tier: "healthy", cashToRecover: 0 };
}

export interface SellableHorse {
  id: string;
  owned: boolean;
  age: number;
  value: number;
}

/** Choose which horse creditors seize: the most valuable owned runner. */
export function selectForcedSaleHorse<T extends SellableHorse>(horses: T[]): T | null {
  const eligible = horses.filter((h) => h.owned && h.age > 0);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, h) => (h.value > best.value ? h : best));
}

/** Compute daily interest charge (positive amount) on a negative balance. */
export function computeDailyInterest(cash: number): number {
  if (cash >= 0) return 0;
  return Math.round(Math.abs(cash) * SOLVENCY_THRESHOLDS.dailyInterestRate);
}
