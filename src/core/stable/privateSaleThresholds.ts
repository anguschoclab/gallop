/**
 * privateSaleThresholds.ts - Shared NPC private sale decision thresholds
 *
 * Extracted so both the resolution phase and the player-facing UI can explain
 * exactly what an NPC stable requires to accept or counter an offer.
 *
 * Dependencies: @/game/types, ./cashPressure
 * Related files: src/core/time/phases/privateSaleResolution.ts, src/components/stable/CashPressureBadge.tsx
 */

import type { Stable, StablePersonality } from "@/game/types";
import { applyCashPressureToThreshold, evaluateCashPressure, type CashPressure } from "./cashPressure";

/** Offer/ask ratio at or above which a personality accepts outright. */
export const ACCEPT_THRESHOLDS: Record<StablePersonality, number> = {
  aggressive: 0.7,
  conservative: 1.0,
  developer: 0.9,
  "win-now": 1.0,
  specialist: 1.0,
  breeder: 1.1,
  trader: 0.8,
  prestige: 1.3,
};

/** Offer/ask ratio at or above which a personality counters rather than declines. */
export const COUNTER_THRESHOLDS: Record<StablePersonality, number> = {
  aggressive: 0.5,
  conservative: 0.8,
  developer: 0.7,
  "win-now": 0.8,
  specialist: 0.8,
  breeder: 0.9,
  trader: 0.6,
  prestige: 1.0,
};

/** Multiplier on the ask used to build the counter amount. */
export const COUNTER_MULTIPLIERS: Record<StablePersonality, number> = {
  aggressive: 1.1,
  conservative: 1.2,
  developer: 1.15,
  "win-now": 1.2,
  specialist: 1.2,
  breeder: 1.25,
  trader: 1.1,
  prestige: 1.4,
};

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
        ratio >= acceptThreshold ? "accepted" : ratio >= counterThreshold ? "countered" : "declined";
    }
  }

  return result;
}
