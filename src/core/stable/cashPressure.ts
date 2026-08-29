/**
 * cashPressure.ts - NPC stable cash pressure model
 *
 * Estimates how financially squeezed an NPC stable is, so that cash-needing
 * stables become more willing to accept lowball private sale offers.
 *
 * All balancing knobs (runway thresholds, max softening, curve shape, label
 * cutoffs) live in `src/data/cashPressureTuning.json` and are surfaced through
 * `src/core/stable/cashPressureTuning.ts`. Edit the JSON to rebalance without
 * touching code.
 *
 * Dependencies: @/game/types (Stable), @/constants/economicConstants (UPKEEP_PER_HORSE), ./cashPressureTuning (getCashPressureTuning)
 * Related files: src/core/time/phases/privateSaleResolution.ts (consumer), src/core/horse/privateSaleDecision.ts (trace consumer)
 */

import type { Stable } from "@/game/types";
import { UPKEEP_PER_HORSE } from "@/constants/economicConstants";
import { getCashPressureTuning } from "./cashPressureTuning";

export interface CashPressure {
  /** 0 = comfortable, 1 = desperate for cash. */
  pressure: number;
  /** Same signal as `pressure`, expressed 0-100 for display. */
  meter: number;
  /** Estimated days of upkeep the current cash covers. */
  runwayDays: number;
  /** Estimated daily upkeep cost of the roster. */
  dailyUpkeep: number;
  /** Player-facing label. */
  label: "comfortable" | "tight" | "strained" | "desperate";
}

/**
 * Evaluate a stable's cash pressure from its cash balance relative to the
 * daily upkeep cost of its roster. The runway->pressure curve is shaped by
 * `pressureCurveExponent` (1 = linear).
 * @param stable
 * @param horseCount
 */
export function evaluateCashPressure(stable: Stable, horseCount?: number): CashPressure {
  const tuning = getCashPressureTuning();
  const horses = Math.max(1, horseCount ?? (stable.horses?.length ?? 0));
  const dailyUpkeep = horses * UPKEEP_PER_HORSE;
  const cash = Math.max(0, stable.cash);
  const runwayDays = dailyUpkeep > 0 ? cash / dailyUpkeep : tuning.comfortDays;

  const span = tuning.comfortDays - tuning.crisisDays;
  const raw = span > 0 ? (tuning.comfortDays - runwayDays) / span : 0;
  const pressure = Math.max(
    0,
    Math.min(1, Math.pow(Math.max(0, raw), tuning.pressureCurveExponent)),
  );

  const { desperate, strained, tight } = tuning.labelThresholds;
  const label: CashPressure["label"] =
    pressure >= desperate
      ? "desperate"
      : pressure >= strained
        ? "strained"
        : pressure >= tight
          ? "tight"
          : "comfortable";

  return { pressure, meter: Math.round(pressure * 100), runwayDays, dailyUpkeep, label };
}

/**
 * Discount an accept/counter threshold based on cash pressure. A desperate
 * stable will take up to `maxThresholdDiscount` less than its personality would
 * normally demand. The pressure->discount curve is shaped by
 * `softeningCurveExponent` (1 = linear).
 * @param threshold
 * @param pressure
 */
export function applyCashPressureToThreshold(threshold: number, pressure: number): number {
  const tuning = getCashPressureTuning();
  const clamped = Math.max(0, Math.min(1, pressure));
  const shaped = Math.pow(clamped, tuning.softeningCurveExponent);
  return threshold * (1 - tuning.maxThresholdDiscount * shaped);
}
