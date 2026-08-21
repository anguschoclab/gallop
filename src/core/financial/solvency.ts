/**
 * core/financial/solvency.ts - Player solvency model.
 *
 * Pure functions used by the solvency pipeline phase to classify the player's
 * financial position, decide when creditors act, and pick a horse for a
 * distressed sale.
 */

import { horsePrice } from "@/core/horse/pricing";
import type { Horse } from "@/core/horse/types";
import { formatCurrency } from "@/core/financial/financialTypes";
import { isPlayerOwned } from "@/core/horse/ownership";

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

/**
 * Classify the player's financial position into an escalation tier.
 *
 * @param {SolvencyInput} input - Cash balance and consecutive days in debt.
 * @returns {SolvencyState} The solvency tier and cash to recover.
 */
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

/**
 * Choose which horse creditors seize: the most valuable owned runner.
 *
 * @param {T[]} horses - Sellable horses to choose from.
 * @returns {T | null} The most valuable owned horse, or null if none eligible.
 */
export function selectForcedSaleHorse<T extends SellableHorse>(horses: T[]): T | null {
  const eligible = horses.filter((h) => h.owned && h.age > 0);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, h) => (h.value > best.value ? h : best));
}

/**
 * Compute daily interest charge (positive amount) on a negative balance.
 *
 * @param {number} cash - Current cash balance (negative incurs interest).
 * @returns {number} The daily interest charge, rounded to nearest integer.
 */
export function computeDailyInterest(cash: number): number {
  if (cash >= 0) return 0;
  return Math.round(Math.abs(cash) * SOLVENCY_THRESHOLDS.dailyInterestRate);
}

export interface DebtBannerDisplay {
  tier: SolvencyTier;
  label: string;
  body: string;
  tone: string;
  icon: string;
  cashToRecover: number;
  daysUntilForcedSale: number;
  interestToday: number;
  belowForcedThreshold: boolean;
  approachingSale: boolean;
  nextAction: string;
  showGraceBadge: boolean;
}

export function computeDebtBannerDisplay(input: {
  cash: number;
  consecutiveDaysInDebt: number;
  imminentWarningDays: number;
}): DebtBannerDisplay | null {
  if (input.cash >= 0) return null;

  const { tier, cashToRecover } = deriveSolvencyState({
    cash: input.cash,
    consecutiveDaysInDebt: input.consecutiveDaysInDebt,
  });
  if (tier === "healthy") return null;

  const days = input.consecutiveDaysInDebt;
  const daysUntilForcedSale = Math.max(0, SOLVENCY_THRESHOLDS.forcedSaleDays - days);
  const interestToday = computeDailyInterest(input.cash);
  const belowForcedThreshold = input.cash <= SOLVENCY_THRESHOLDS.forcedSaleCash;
  const approachingSale =
    tier === "warning" && belowForcedThreshold && daysUntilForcedSale <= input.imminentWarningDays;

  const nextAction =
    tier === "insolvent"
      ? "Run ends — legacy epilogue"
      : tier === "forced_sale"
        ? "Creditors seize your top horse (70% of value)"
        : belowForcedThreshold
          ? `Forced sale in ${daysUntilForcedSale} day${daysUntilForcedSale === 1 ? "" : "s"} unless balance recovers above ${formatCurrency(SOLVENCY_THRESHOLDS.forcedSaleCash)}`
          : `Interest continues; forced sale triggers if balance stays below ${formatCurrency(SOLVENCY_THRESHOLDS.forcedSaleCash)} for ${SOLVENCY_THRESHOLDS.forcedSaleDays} days`;

  const config = {
    warning: {
      label: approachingSale ? "Forced sale imminent" : "Cash reserves depleted",
      body: `Debt ${formatCurrency(cashToRecover)}. Interest accrues daily.`,
      tone: approachingSale
        ? "border-red-500/60 bg-red-500/15 text-red-100"
        : "border-amber-500/50 bg-amber-500/10 text-amber-100",
      icon: approachingSale ? "text-red-300" : "text-amber-300",
    },
    forced_sale: {
      label: "Creditors are moving in",
      body: `Debt ${formatCurrency(cashToRecover)} for ${days} days. Assets may be seized to cover overdue balances.`,
      tone: "border-red-600/60 bg-red-600/15 text-red-100",
      icon: "text-red-300",
    },
    insolvent: {
      label: "Insolvent",
      body: `Debt ${formatCurrency(cashToRecover)} exceeded the floor. Run over.`,
      tone: "border-red-800/70 bg-red-900/25 text-red-100",
      icon: "text-red-400",
    },
  }[tier];

  return {
    tier,
    label: config.label,
    body: config.body,
    tone: config.tone,
    icon: config.icon,
    cashToRecover,
    daysUntilForcedSale,
    interestToday,
    belowForcedThreshold,
    approachingSale,
    nextAction,
    showGraceBadge: tier === "warning" && belowForcedThreshold,
  };
}

export interface SeizurePreview {
  horseId: string;
  horseName: string;
  assessedValue: number;
  salePrice: number;
  deficitAfter: number;
}

export function previewSeizure(horses: Horse[], cash: number): SeizurePreview | null {
  const candidates = horses
    .filter((h) => isPlayerOwned(h) && h.age > 0)
    .map((h) => ({
      id: h.id,
      owned: true,
      age: h.age,
      value: horsePrice(h),
      name: h.name,
    }));

  const picked = selectForcedSaleHorse(candidates);
  if (!picked) return null;

  const salePrice = Math.round(picked.value * SOLVENCY_THRESHOLDS.distressSaleRate);
  const deficitAfter = Math.max(0, Math.abs(cash) - salePrice);

  return {
    horseId: picked.id,
    horseName: picked.name,
    assessedValue: picked.value,
    salePrice,
    deficitAfter,
  };
}
