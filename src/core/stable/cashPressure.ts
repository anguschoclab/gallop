/**
 * cashPressure.ts - NPC stable cash pressure model
 *
 * Estimates how financially squeezed an NPC stable is, so that cash-needing
 * stables become more willing to accept lowball private sale offers.
 *
 * Dependencies: @/game/types (Stable), @/constants/economicConstants (UPKEEP_PER_HORSE)
 * Related files: src/core/time/phases/privateSaleResolution.ts (consumer)
 */

import type { Stable } from "@/game/types";
import { UPKEEP_PER_HORSE } from "@/constants/economicConstants";

/** Days of upkeep runway at or above which a stable feels no cash pressure. */
export const CASH_PRESSURE_COMFORT_DAYS = 120;

/** Days of upkeep runway at or below which a stable is maximally desperate. */
export const CASH_PRESSURE_CRISIS_DAYS = 20;

/** Maximum discount applied to accept/counter thresholds at full pressure. */
export const CASH_PRESSURE_MAX_THRESHOLD_DISCOUNT = 0.25;

export interface CashPressure {
  /** 0 = comfortable, 1 = desperate for cash. */
  pressure: number;
  /** Estimated days of upkeep the current cash covers. */
  runwayDays: number;
  /** Player-facing label. */
  label: "comfortable" | "tight" | "strained" | "desperate";
}

/**
 * Evaluate a stable's cash pressure from its cash balance relative to the
 * daily upkeep cost of its roster.
 */
export function evaluateCashPressure(stable: Stable, horseCount?: number): CashPressure {
  const horses = Math.max(1, horseCount ?? stable.horses.length);
  const dailyUpkeep = horses * UPKEEP_PER_HORSE;
  const cash = Math.max(0, stable.cash);
  const runwayDays = dailyUpkeep > 0 ? cash / dailyUpkeep : CASH_PRESSURE_COMFORT_DAYS;

  const span = CASH_PRESSURE_COMFORT_DAYS - CASH_PRESSURE_CRISIS_DAYS;
  const raw = (CASH_PRESSURE_COMFORT_DAYS - runwayDays) / span;
  const pressure = Math.max(0, Math.min(1, raw));

  const label: CashPressure["label"] =
    pressure >= 0.75 ? "desperate" : pressure >= 0.5 ? "strained" : pressure >= 0.25 ? "tight" : "comfortable";

  return { pressure, runwayDays, label };
}

/**
 * Discount an accept/counter threshold based on cash pressure. A desperate
 * stable will take up to CASH_PRESSURE_MAX_THRESHOLD_DISCOUNT less than its
 * personality would normally demand.
 */
export function applyCashPressureToThreshold(threshold: number, pressure: number): number {
  const clamped = Math.max(0, Math.min(1, pressure));
  return threshold * (1 - CASH_PRESSURE_MAX_THRESHOLD_DISCOUNT * clamped);
}
