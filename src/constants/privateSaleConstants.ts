/**
 * Constants for NPC private sale offer tiers, override negotiation, and diplomatic pressure.
 */

import type { ReputationTier } from "@/core/reputation/reputationTypes";
import type { StablePersonality } from "@/game/types";

// ── NPC accept / counter / counter-multiplier thresholds ──

/**
 * Offer ratio (offer / valuation) at or above which an NPC accepts. Lower
 * values = more willing to sell. Cash pressure softens these downward.
 */
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

/**
 * Offer ratio at or above which an NPC counters (instead of declining). Cash
 * pressure softens these downward.
 */
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

/**
 * Multiplier on valuation used to compute the counter amount. Cash pressure
 * softens these downward (a squeezed stable counters lower).
 */
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

/**
 * Cash-pressure level at or above which the accept log calls out that the
 * stable is "short of cash". Kept here so the wording threshold is tunable
 * alongside the rest of the private-sale constants.
 */
export const CASH_PRESSURE_SHORT_OF_CASH_LOG_THRESHOLD = 0.5;

// ── Suggested offer tiers ──

/** Rounding increment for quick-offer amounts (nearest $500). */
export const OFFER_ROUND_INCREMENT = 500;

/** Multiplier for the lowball quick-offer tier. */
export const LOWBALL_OFFER_MULTIPLIER = 0.75;

/** Multiplier for the generous quick-offer tier (must exceed max accept threshold of 1.3). */
export const GENEROUS_OFFER_MULTIPLIER = 1.35;

// ── Premium buyout ──

/** Fallback premium multiplier when tier lookup fails. */
export const PREMIUM_FALLBACK_MULTIPLIER = 1.5;

// ── Diplomatic pressure ──

/** Base success odds before modifiers. */
export const DIPLOMATIC_BASE_ODDS = 0.4;

/** Friction above this threshold gives an odds boost. */
export const DIPLOMATIC_FRICTION_THRESHOLD = 50;

/** Odds boost when friction exceeds the threshold. */
export const DIPLOMATIC_FRICTION_BOOST = 0.1;

/** Multiplier applied per tier-penalty step. */
export const DIPLOMATIC_TIER_PENALTY_STEP = 0.15;

/** Reputation below this threshold gives an odds penalty. */
export const DIPLOMATIC_REPUTATION_THRESHOLD = 50;

/** Odds penalty when reputation is below the threshold. */
export const DIPLOMATIC_REPUTATION_PENALTY = 0.1;

/** Minimum diplomatic odds after clamping. */
export const DIPLOMATIC_MIN_ODDS = 0.05;

/** Maximum diplomatic odds after clamping. */
export const DIPLOMATIC_MAX_ODDS = 0.85;

/** Multiplier on ask for the diplomatic success cost. */
export const DIPLOMATIC_SUCCESS_COST_MULTIPLIER = 1.1;

/** Friction increase applied on diplomatic pressure failure. */
export const DIPLOMATIC_FAILURE_FRICTION_PENALTY = 20;

// ── Known buyer premium ──

/**
 * Premium fraction applied to protected/untouchable horses when the player is
 * known in the racing world. AI stables charge more to part with their best
 * horses to a competitor they recognize. Scales with the player's reputation
 * tier — the more famous the player, the higher the premium.
 */
export const KNOWN_BUYER_PREMIUM_BY_TIER: Partial<Record<ReputationTier, number>> = {
  regional: 0.1,
  national: 0.15,
  international: 0.2,
  world_class: 0.25,
  legendary: 0.3,
};
