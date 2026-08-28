/**
 * privateSaleThresholds.ts - Shared NPC private sale decision thresholds
 *
 * Extracted so both the resolution phase and the player-facing UI can explain
 * exactly what an NPC stable requires to accept or counter an offer.
 *
 * Dependencies: @/game/types, ./cashPressure
 * Related files: src/core/time/phases/privateSaleResolution.ts, src/components/stable/CashPressureBadge.tsx
 */

import type { Stable } from "@/game/types";
import {
  applyCashPressureToThreshold,
  evaluateCashPressure,
  type CashPressure,
} from "./cashPressure";
import {
  ACCEPT_THRESHOLDS,
  COUNTER_THRESHOLDS,
  COUNTER_MULTIPLIERS,
} from "@/constants/privateSaleConstants";

// Re-export for backward compatibility — the canonical source is now
// `@/constants/privateSaleConstants`.
export { ACCEPT_THRESHOLDS, COUNTER_THRESHOLDS, COUNTER_MULTIPLIERS };

export interface PrivateSaleThresholds {
  /** Cash pressure evaluation for the stable. */
  cashPressure: CashPressure;
  /** Base (personality) accept ratio before cash pressure. */
  baseAcceptThreshold: number;
  /** Effective accept ratio after cash pressure discount. */
  acceptThreshold: number;
  /** Effective counter ratio after cash pressure discount. */
  counterThreshold: number;
  /** Effective counter multiplier after cash pressure discount. */
  counterMultiplier: number;
  /** Cash amount needed to hit the accept threshold, when an ask is known. */
  acceptAmount?: number;
  /** Cash amount needed to hit the counter threshold, when an ask is known. */
  counterAmount?: number;
  /** Likely counter terms if they counter, when an ask is known. */
  likelyCounterTerms?: number;
  /** offer / ask, when an offer is known. */
  offerRatio?: number;
  /** Money short of the accept threshold (0 when at or above). */
  shortfallAmount?: number;
  /** Percentage points the offer sits below the accept threshold (0 when at or above). */
  shortfallPercent?: number;
  /** Projected outcome for the given offer. */
  projectedOutcome?: "accepted" | "countered" | "declined";
}

/**
 * Compute the effective accept/counter thresholds for a stable, optionally
 * projecting an offer against them.
 * @param stable
 * @param options
 * @param options.ask
 * @param options.offerAmount
 * @param options.horseCount
 */
export function evaluatePrivateSaleThresholds(
  stable: Stable,
  options: { ask?: number; offerAmount?: number; horseCount?: number } = {},
): PrivateSaleThresholds {
  const cashPressure = evaluateCashPressure(stable, options.horseCount);
  const base = ACCEPT_THRESHOLDS[stable.personality];
  const acceptThreshold = applyCashPressureToThreshold(base, cashPressure.pressure);
  const counterThreshold = applyCashPressureToThreshold(
    COUNTER_THRESHOLDS[stable.personality],
    cashPressure.pressure,
  );
  const counterMultiplier = applyCashPressureToThreshold(
    COUNTER_MULTIPLIERS[stable.personality],
    cashPressure.pressure,
  );

  const result: PrivateSaleThresholds = {
    cashPressure,
    baseAcceptThreshold: base,
    acceptThreshold,
    counterThreshold,
    counterMultiplier,
  };

  const ask = options.ask;
  if (ask !== undefined && ask > 0) {
    result.acceptAmount = Math.round(ask * acceptThreshold);
    result.counterAmount = Math.round(ask * counterThreshold);
    result.likelyCounterTerms = Math.round(ask * counterMultiplier);

    const offer = options.offerAmount;
    if (offer !== undefined && offer > 0) {
      const ratio = offer / ask;
      result.offerRatio = ratio;
      result.shortfallAmount = Math.max(0, Math.round(ask * acceptThreshold - offer));
      result.shortfallPercent = Math.max(0, (acceptThreshold - ratio) * 100);
      result.projectedOutcome =
        ratio >= acceptThreshold
          ? "accepted"
          : ratio >= counterThreshold
            ? "countered"
            : "declined";
    }
  }

  return result;
}
