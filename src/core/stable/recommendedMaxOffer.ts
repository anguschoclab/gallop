/**
 * recommendedMaxOffer.ts - Display-ready recommended max offer for an NPC stable
 *
 * Thin wrapper over `evaluatePrivateSaleThresholds` that returns a display-ready
 * object with the softened accept threshold, softening gap, counter multiplier,
 * and (when an ask is known) dollar amounts for max offer, likely counter, and
 * shortfall vs a player's current offer.
 *
 * Dependencies: @/game/types (Stable), ./privateSaleThresholds (evaluatePrivateSaleThresholds)
 * Related files: src/components/stable/RecommendedMaxOfferLine.tsx (UI consumer),
 *   src/components/stable/StableCompareTable.tsx (UI consumer)
 */

import type { Stable } from "@/game/types";
import { evaluatePrivateSaleThresholds } from "./privateSaleThresholds";

export interface RecommendedMaxOffer {
  /** Softened accept threshold as a fraction of ask (0-1). Always present. */
  acceptThreshold: number;
  /** Personality base accept threshold before cash-pressure softening. */
  baseAcceptThreshold: number;
  /** Softening discount in percentage points (base - softened) × 100. >= 0. */
  softeningPoints: number;
  /** Counter multiplier (×ask) after softening. */
  counterMultiplier: number;
  /** Dollar max offer for an instant accept, when an ask is known. */
  maxOfferAmount?: number;
  /** Dollar likely counter, when an ask is known. */
  likelyCounterAmount?: number;
  /** $ short of the accept amount (0 when at or above). */
  shortfallAmount?: number;
  /** Shortfall as percentage points below accept threshold. */
  shortfallPercent?: number;
  /** Projected outcome for the given offer. */
  projectedOutcome?: "accepted" | "countered" | "declined";
}

/**
 * Compute a display-ready recommended max offer for an NPC stable.
 * @param stable - The NPC stable
 * @param options
 * @param options.ask - Attachment-adjusted asking price for a specific horse
 * @param options.offerAmount - Player's current offer amount
 * @param options.horseCount - Override horse count (defaults to stable.horses.length)
 */
export function recommendedMaxOffer(
  stable: Stable,
  options: { ask?: number; offerAmount?: number; horseCount?: number } = {},
): RecommendedMaxOffer {
  const thresholds = evaluatePrivateSaleThresholds(stable, options);
  const softeningPoints = Math.max(
    0,
    (thresholds.baseAcceptThreshold - thresholds.acceptThreshold) * 100,
  );

  return {
    acceptThreshold: thresholds.acceptThreshold,
    baseAcceptThreshold: thresholds.baseAcceptThreshold,
    softeningPoints,
    counterMultiplier: thresholds.counterMultiplier,
    maxOfferAmount: thresholds.acceptAmount,
    likelyCounterAmount: thresholds.likelyCounterTerms,
    shortfallAmount: thresholds.shortfallAmount,
    shortfallPercent: thresholds.shortfallPercent,
    projectedOutcome: thresholds.projectedOutcome,
  };
}
