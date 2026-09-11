/**
 * entryScoringConstants.ts - Shared constants and tier pickers for race entry scoring.
 *
 * Extracted from entryScoring.ts so both the coordinator and the individual
 * scorers can share these without circular dependencies.
 *
 * Per PR 6 of the megaplan.
 */

import type { StableTier } from "@/game/types";
import { BASE_RACE_WEIGHT_LBS, MIN_ENERGY_TO_ENTER } from "@/constants";

// Base purse appeal thresholds by tier (modified by personality)
export const BASE_PURSE_APPEAL: Record<StableTier, number> = {
  elite: 100000,
  mid: 25000,
  budget: 5000,
};

// Entry scoring constants
export const SCORING_CONSTANTS = {
  // Class scoring
  CLASS_GAP_MIN: -5,
  CLASS_GAP_MAX: 10,
  CLASS_OVERQUALIFIED_BONUS: 30,
  CLASS_OVERQUALIFIED_PENALTY_BASE: 20,
  CLASS_UNDERQUALIFIED_BONUS: 20,
  // Distance scoring
  DIST_PERFECT_BONUS: 30,
  DIST_GOOD_BONUS: 15,
  DIST_OK_BONUS: 5,
  DIST_BAD_PENALTY: -15,
  DIST_PERFECT_THRESHOLD: 100,
  DIST_GOOD_THRESHOLD: 300,
  DIST_OK_THRESHOLD: 600,
  // Surface scoring
  SURFACE_EXCELLENT_THRESHOLD: 1.0,
  SURFACE_EXCELLENT_BONUS: 20,
  SURFACE_GOOD_THRESHOLD: 0.95,
  SURFACE_GOOD_BONUS: 5,
  SURFACE_BAD_PENALTY: -20,
  // Purse scoring
  DEFAULT_PURSE_APPEAL: 10000,
  PURSE_HIGH_MULTIPLIER: 2,
  PURSE_HIGH_BONUS: 25,
  PURSE_MEDIUM_BONUS: 15,
  PURSE_LOW_MULTIPLIER: 0.5,
  PURSE_LOW_BONUS: 5,
  // Youth preference
  YOUTH_PREFERENCE_HIGH: 0.7,
  YOUTH_PREFERENCE_LOW: 0.3,
  YOUNG_HORSE_AGE: 3,
  PROVEN_HORSE_AGE: 5,
  YOUTH_BONUS: 10,
  // Form scoring
  FORM_GOOD_THRESHOLD: 3,
  FORM_GOOD_BONUS: 10,
  FORM_BAD_THRESHOLD: -3,
  FORM_BAD_PENALTY_BASE: 10,
  FORM_TOLERANCE_BASE: 2,
  // Energy scoring
  ENERGY_HIGH_THRESHOLD: 80,
  ENERGY_HIGH_BONUS: 5,
  ENERGY_LOW_PENALTY: -20,
  MIN_ENERGY_TO_ENTER_VALUE: MIN_ENERGY_TO_ENTER,
  // Fame and purse bonuses
  FAME_HIGH_THRESHOLD: 50,
  FAME_PURSE_THRESHOLD: 100000,
  FAME_PURSE_BONUS: 10,
  // Graded race bonuses
  G1_BONUS_BASE: 15,
  G2_BONUS_BASE: 10,
  G3_BONUS_BASE: 5,
  OTHER_BONUS_BASE: 5,
  GRADED_BONUS_MULTIPLIER: 0.5,
  // Claiming scoring
  CLAIMING_TRADER_BONUS: 20,
  CLAIMING_OTHER_PENALTY: -5,
  CLAIMING_OVERQUALIFIED_PENALTY: -30,
  CLAIMING_QUALIFIED_BONUS: 10,
  CLAIMING_FLEXIBILITY_BONUS: 5,
  CLAIMING_HISTORY_THRESHOLD: 10000,
  CLAIMING_HISTORY_BONUS: 15,
  // Weight calculations
  BASE_WEIGHT_LBS: BASE_RACE_WEIGHT_LBS,
  SEX_ALLOWANCE_LBS: 3,
  AGE_ALLOWANCE_LBS: 2,
} as const;

// Graded race bonus base by grade — replaces the if/else-if chain
export const GRADED_BONUS_BASE: Record<string, number> = {
  G1: SCORING_CONSTANTS.G1_BONUS_BASE,
  G2: SCORING_CONSTANTS.G2_BONUS_BASE,
  G3: SCORING_CONSTANTS.G3_BONUS_BASE,
};

// Distance fit bonus tiers — ordered from most-specific (perfect) to least-specific (ok).
export const DISTANCE_FIT_TIERS: ReadonlyArray<{ threshold: number; bonus: number }> = [
  {
    threshold: SCORING_CONSTANTS.DIST_PERFECT_THRESHOLD,
    bonus: SCORING_CONSTANTS.DIST_PERFECT_BONUS,
  },
  { threshold: SCORING_CONSTANTS.DIST_GOOD_THRESHOLD, bonus: SCORING_CONSTANTS.DIST_GOOD_BONUS },
  { threshold: SCORING_CONSTANTS.DIST_OK_THRESHOLD, bonus: SCORING_CONSTANTS.DIST_OK_BONUS },
];

// Surface fit bonus tiers — ordered from most-specific (excellent) to least-specific (good).
export const SURFACE_FIT_TIERS: ReadonlyArray<{ threshold: number; bonus: number }> = [
  {
    threshold: SCORING_CONSTANTS.SURFACE_EXCELLENT_THRESHOLD,
    bonus: SCORING_CONSTANTS.SURFACE_EXCELLENT_BONUS,
  },
  {
    threshold: SCORING_CONSTANTS.SURFACE_GOOD_THRESHOLD,
    bonus: SCORING_CONSTANTS.SURFACE_GOOD_BONUS,
  },
];

/**
 * Pick the first tier whose threshold passes for an "at-least" comparison
 * (aptitude >= threshold). Returns the fallback bonus if no tier matches.
 * @param value
 * @param tiers
 * @param fallback
 */
export function pickAtLeastTier(
  value: number,
  tiers: ReadonlyArray<{ threshold: number; bonus: number }>,
  fallback: number,
): number {
  for (const tier of tiers) {
    if (value >= tier.threshold) return tier.bonus;
  }
  return fallback;
}

/**
 * Pick the first tier whose threshold passes for an "at-most" comparison
 * (distance diff <= threshold). Returns the fallback bonus if no tier matches.
 * @param value
 * @param tiers
 * @param fallback
 */
export function pickAtMostTier(
  value: number,
  tiers: ReadonlyArray<{ threshold: number; bonus: number }>,
  fallback: number,
): number {
  for (const tier of tiers) {
    if (value <= tier.threshold) return tier.bonus;
  }
  return fallback;
}
