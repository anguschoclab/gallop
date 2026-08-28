/**
 * privateSaleDecision.ts - Pure NPC private sale offer decision logic + trace.
 *
 * Extracts the threshold/softening/decision math out of
 * `src/core/time/phases/privateSaleResolution.ts` so the phase and the dev/test
 * decision trace share one source of truth. The phase calls
 * `computePrivateSaleDecision` and then only handles impacts/logs; tests and
 * debug tooling call `buildPrivateSaleDecisionTrace` to inspect the full
 * reasoning (runway, computed thresholds, offer comparison, final result).
 *
 * Dependencies: @/game/types (Stable, Horse, PrivateSaleOffer, StablePersonality), @/core/stable/cashPressure (evaluateCashPressure, applyCashPressureToThreshold, CashPressure), @/core/horse/attachment (HorseAttachment), @/constants/privateSaleConstants (ACCEPT/COUNTER thresholds + multipliers)
 * Related files: src/core/time/phases/privateSaleResolution.ts (consumer)
 */

import type { Stable, Horse, PrivateSaleOffer, StablePersonality } from "@/game/types";
import type { HorseAttachment } from "@/core/horse/attachment";
import {
  evaluateCashPressure,
  applyCashPressureToThreshold,
  type CashPressure,
} from "@/core/stable/cashPressure";
import {
  ACCEPT_THRESHOLDS,
  COUNTER_THRESHOLDS,
  COUNTER_MULTIPLIERS,
} from "@/constants/privateSaleConstants";
import { UPKEEP_PER_HORSE } from "@/constants/economicConstants";

export type PrivateSaleDecision = "accepted" | "countered" | "declined";

export interface PrivateSaleDecisionInput {
  stable: Stable;
  horse: Horse;
  offer: Pick<PrivateSaleOffer, "amount">;
  /** attachmentAdjustedAsk(...) result — the stable's asking price. */
  valuation: number;
  attachment: HorseAttachment;
}

export interface PrivateSaleDecisionResult {
  decision: PrivateSaleDecision;
  /** Counter amount, only present when decision === "countered". */
  counterAmount?: number;
  /** Offer / valuation ratio. */
  offerRatio: number;
  /** Cash pressure snapshot used for the decision. */
  cashPressure: CashPressure;
  /** Personality's base accept threshold (before softening). */
  baseAcceptThreshold: number;
  /** Personality's base counter threshold (before softening). */
  baseCounterThreshold: number;
  /** Personality's base counter multiplier (before softening). */
  baseCounterMultiplier: number;
  /** Accept threshold after cash-pressure softening. */
  softenedAcceptThreshold: number;
  /** Counter threshold after cash-pressure softening. */
  softenedCounterThreshold: number;
  /** Counter multiplier after cash-pressure softening. */
  softenedCounterMultiplier: number;
}

/**
 * Compute the NPC's accept/counter/decline decision for a pending private sale
 * offer. Pure: no RNG, no side effects. Mirrors the normal-pending branch of
 * `privateSaleResolutionPhase`.
 * @param input
 */
export function computePrivateSaleDecision(
  input: PrivateSaleDecisionInput,
): PrivateSaleDecisionResult {
  const { stable, offer, valuation, attachment: _attachment } = input;
  const personality = stable.personality as StablePersonality;

  const offerRatio = valuation > 0 ? offer.amount / valuation : 0;
  const cashPressure = evaluateCashPressure(stable, stable.horses.length);

  const baseAcceptThreshold = ACCEPT_THRESHOLDS[personality];
  const baseCounterThreshold = COUNTER_THRESHOLDS[personality];
  const baseCounterMultiplier = COUNTER_MULTIPLIERS[personality];

  const softenedAcceptThreshold = applyCashPressureToThreshold(
    baseAcceptThreshold,
    cashPressure.pressure,
  );
  const softenedCounterThreshold = applyCashPressureToThreshold(
    baseCounterThreshold,
    cashPressure.pressure,
  );
  const softenedCounterMultiplier = applyCashPressureToThreshold(
    baseCounterMultiplier,
    cashPressure.pressure,
  );

  if (offerRatio >= softenedAcceptThreshold) {
    return {
      decision: "accepted",
      offerRatio,
      cashPressure,
      baseAcceptThreshold,
      baseCounterThreshold,
      baseCounterMultiplier,
      softenedAcceptThreshold,
      softenedCounterThreshold,
      softenedCounterMultiplier,
    };
  }

  if (offerRatio >= softenedCounterThreshold) {
    const counterAmount = Math.round(valuation * softenedCounterMultiplier);
    return {
      decision: "countered",
      counterAmount,
      offerRatio,
      cashPressure,
      baseAcceptThreshold,
      baseCounterThreshold,
      baseCounterMultiplier,
      softenedAcceptThreshold,
      softenedCounterThreshold,
      softenedCounterMultiplier,
    };
  }

  return {
    decision: "declined",
    offerRatio,
    cashPressure,
    baseAcceptThreshold,
    baseCounterThreshold,
    baseCounterMultiplier,
    softenedAcceptThreshold,
    softenedCounterThreshold,
    softenedCounterMultiplier,
  };
}

export interface PrivateSaleDecisionTrace {
  stableName: string;
  horseName: string;
  personality: StablePersonality;
  cash: number;
  horseCount: number;
  dailyUpkeep: number;
  runwayDays: number;
  pressure: number;
  pressureLabel: CashPressure["label"];
  baseAcceptThreshold: number;
  baseCounterThreshold: number;
  baseCounterMultiplier: number;
  softenedAcceptThreshold: number;
  softenedCounterThreshold: number;
  softenedCounterMultiplier: number;
  offerAmount: number;
  valuation: number;
  offerRatio: number;
  decision: PrivateSaleDecision;
  counterAmount?: number;
}

/**
 * Build a structured decision trace for an NPC private sale offer negotiation.
 * Intended for dev/test inspection: shows upkeep runway, computed (softened)
 * thresholds, the offer comparison, and the final accept/counter/decline
 * result. Wraps `computePrivateSaleDecision` so the trace and the phase share
 * one source of truth.
 * @param input
 */
export function buildPrivateSaleDecisionTrace(
  input: PrivateSaleDecisionInput,
): PrivateSaleDecisionTrace {
  const result = computePrivateSaleDecision(input);
  const { stable, horse, offer, valuation } = input;
  const horseCount = Math.max(1, stable.horses.length);

  return {
    stableName: stable.name,
    horseName: horse.name,
    personality: stable.personality as StablePersonality,
    cash: Math.max(0, stable.cash),
    horseCount,
    dailyUpkeep: horseCount * UPKEEP_PER_HORSE,
    runwayDays: result.cashPressure.runwayDays,
    pressure: result.cashPressure.pressure,
    pressureLabel: result.cashPressure.label,
    baseAcceptThreshold: result.baseAcceptThreshold,
    baseCounterThreshold: result.baseCounterThreshold,
    baseCounterMultiplier: result.baseCounterMultiplier,
    softenedAcceptThreshold: result.softenedAcceptThreshold,
    softenedCounterThreshold: result.softenedCounterThreshold,
    softenedCounterMultiplier: result.softenedCounterMultiplier,
    offerAmount: offer.amount,
    valuation,
    offerRatio: result.offerRatio,
    decision: result.decision,
    counterAmount: result.counterAmount,
  };
}

/**
 * Format a decision trace as a single-line `[trace]` log string for dev/test
 * emission. Kept compact so it fits in the existing `{ day, text }` log entry.
 * @param trace
 */
export function formatPrivateSaleDecisionTrace(trace: PrivateSaleDecisionTrace): string {
  const counter =
    trace.decision === "countered" && trace.counterAmount !== undefined
      ? ` counter=$${trace.counterAmount.toLocaleString()}`
      : "";
  return (
    `[trace] ${trace.stableName} (${trace.personality}) → ${trace.horseName}: ` +
    `runway=${trace.runwayDays.toFixed(1)}d pressure=${trace.pressure.toFixed(2)} (${trace.pressureLabel}) ` +
    `accept≥${trace.softenedAcceptThreshold.toFixed(2)} counter≥${trace.softenedCounterThreshold.toFixed(2)} ` +
    `offer=$${trace.offerAmount.toLocaleString()} ask=$${trace.valuation.toLocaleString()} ` +
    `ratio=${trace.offerRatio.toFixed(2)} → ${trace.decision}${counter}`
  );
}
