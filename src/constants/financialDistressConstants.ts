/**
 * financialDistressConstants.ts
 *
 * All constants for the NPC financial distress system.
 * Used by: financialDistressAI.ts, intentGenerators.ts, strategicCoordinator.ts,
 * breeding.ts, upkeep.ts, auctionAI.ts
 */

// ─── Distress Tier Thresholds (days of cash) ─────────────────────────────────

export const DISTRESS_CAUTION_THRESHOLD = 30;
export const DISTRESS_EMERGENCY_THRESHOLD = 14;
export const DISTRESS_CRITICAL_THRESHOLD = 7;

// ─── Personality Early Trigger ───────────────────────────────────────────────

export const PERSONALITY_EARLY_TRIGGER_DAYS = 5;

export const CAUTIOUS_PERSONALITIES = ["conservative", "breeder", "prestige"] as const;
export const AGGRESSIVE_PERSONALITIES = ["aggressive", "win-now", "trader"] as const;

// ─── Directive Weights by Distress Level ─────────────────────────────────────

export const DISTRESS_DIRECTIVE_WEIGHT = {
  caution: 0.5,
  emergency: 0.8,
  critical: 1.0,
} as const;

export const DISTRESS_DIRECTIVE_PRIORITY = 0;

// ─── Budget Allocation Multipliers by Distress Level ─────────────────────────

export const DISTRESS_BUDGET_MULTIPLIER = {
  caution: 0.5,
  emergency: 0.1,
  critical: 0.01,
} as const;

// ─── Stud Fee Reduction ──────────────────────────────────────────────────────

export const STUD_FEE_REDUCTION_MULTIPLIER = {
  caution: 0.85,
  emergency: 0.6,
  critical: 0.3,
} as const;

export const STUD_FEE_MINIMUM = {
  caution: 1000,
  emergency: 500,
  critical: 100,
} as const;

export const STUD_FEE_INTENT_PRIORITY = 60;

// ─── Personality Modifiers for Stud Fee Reduction ────────────────────────────

export const PRESTIGE_STUD_FEE_RESISTANCE = 0.5;
export const TRADER_STUD_FEE_AGGRESSION = 1.3;

// ─── Breeding Reduction ──────────────────────────────────────────────────────

export const BREEDING_MARE_FRACTION = {
  caution: 0.5,
  emergency: 0.25,
} as const;

export const EMERGENCY_STUD_FEE_CAP_FRACTION = 0.5;

// ─── Upkeep Cost Cut Multipliers ─────────────────────────────────────────────

export const UPKEEP_DISTRESS_MULTIPLIER = {
  caution: 0.75,
  emergency: 0.5,
  critical: 0.25,
} as const;

// ─── Auction Consignment Distress Thresholds ─────────────────────────────────

export const DISTRESS_CONSIGN_RATING_REDUCTION = 10;
export const DISTRESS_CONSIGN_AGE_REDUCTION = 1;
export const DISTRESS_EMERGENCY_CONSIGN_RATING_THRESHOLD = 65;
export const DISTRESS_CRITICAL_TOP_HORSES_KEPT = 3;

// ─── Training Distress Thresholds ────────────────────────────────────────────

export const TRAINING_CAUTION_MIN_ENERGY = 30;
export const TRAINING_EMERGENCY_REST_ONLY = true;
