/**
 * entryScoring.ts - Race entry suitability scoring
 *
 * This file provides scoring functions for evaluating how well a horse matches
 * a race based on class, distance, surface, track geometry, purse, and stable personality.
 * Used for NPC race entry decisions and race recommendation systems.
 *
 * Dependencies: @/game/types (Horse, Race, Stable, StableTier), @/core/horse/stats (calculateOverallRating), @/core/horse/gender (isFemaleHorse), @/core/stable/stableConfig (PERSONALITY_CONFIG), @/game/claiming (isHorseEligibleForClaimingPrice, getSuggestedClaimingPriceRange), ./trackGeometry (calculateTrackGeometryScore, calculateGradientScore)
 * Related files: npcDailyCycle.ts (uses for NPC race entry), store.ts (uses for race recommendations)
 */

import type { Horse, Race, Stable, StableTier } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { isFemaleHorse } from "@/core/horse/gender";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import {
  isHorseEligibleForClaimingPrice,
  getSuggestedClaimingPriceRange,
} from "@/core/market/claiming";
import { calculateTrackGeometryScore, calculateGradientScore } from "./trackGeometry";
import {
  BASE_RACE_WEIGHT_LBS,
  MAX_HORSES_PER_STABLE_PER_RACE,
  MIN_ENERGY_TO_ENTER,
  MIN_FORM_TO_ENTER,
  PREFERRED_DISTANCE_RANGE,
} from "@/constants";

// Base purse appeal thresholds by tier (modified by personality)
export const BASE_PURSE_APPEAL: Record<StableTier, number> = {
  elite: 100000,
  mid: 25000,
  budget: 5000,
};

// Entry scoring constants
const SCORING_CONSTANTS = {
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

/**
 * Calculate horse's suitability score for a race.
 *
 * Higher score = better match. Personality affects scoring significantly.
 * Evaluates class match, distance fit, surface fit, track geometry, gradient,
 * purse appeal, form, energy, fame, graded race bonuses, and claiming race logic.
 *
 * @param horse - The horse to evaluate
 * @param race - The race to evaluate
 * @param stable - The stable making the decision
 * @returns Suitability score (higher is better)
 *
 * @example
 * const score = calculateRaceSuitability(horse, race, stable);
 */
export function calculateRaceSuitability(horse: Horse, race: Race, stable: Stable): number {
  const personality = PERSONALITY_CONFIG[stable.personality];
  let score = 0;
  const overall = calculateOverallRating(horse);

  // Class match - affected by risk tolerance
  if (race.minStat) {
    const gap = overall - race.minStat;
    const riskTolerance = personality.riskTolerance;
    if (gap >= SCORING_CONSTANTS.CLASS_GAP_MIN && gap <= SCORING_CONSTANTS.CLASS_GAP_MAX) {
      score += SCORING_CONSTANTS.CLASS_OVERQUALIFIED_BONUS;
    } else if (gap > SCORING_CONSTANTS.CLASS_GAP_MAX) {
      score += (SCORING_CONSTANTS.CLASS_OVERQUALIFIED_PENALTY_BASE - gap) * riskTolerance; // Risk-takers still enter overqualified
    } else {
      score += gap * riskTolerance; // Risk-takers may enter underqualified
    }
  } else {
    score += SCORING_CONSTANTS.CLASS_UNDERQUALIFIED_BONUS;
  }

  // Distance fit - use horse's personal aptitude
  const distDiff = Math.abs(race.distance - horse.distanceAptitude);
  if (distDiff <= SCORING_CONSTANTS.DIST_PERFECT_THRESHOLD)
    score += SCORING_CONSTANTS.DIST_PERFECT_BONUS;
  else if (distDiff <= SCORING_CONSTANTS.DIST_GOOD_THRESHOLD)
    score += SCORING_CONSTANTS.DIST_GOOD_BONUS;
  else if (distDiff <= SCORING_CONSTANTS.DIST_OK_THRESHOLD)
    score += SCORING_CONSTANTS.DIST_OK_BONUS;
  else score += SCORING_CONSTANTS.DIST_BAD_PENALTY;

  // Surface fit - use horse's personal aptitude
  const surface = race.surface || race.graded?.surface;
  if (surface) {
    const apt = horse.surfaceAptitude[surface] ?? SCORING_CONSTANTS.SURFACE_GOOD_THRESHOLD;
    if (apt >= SCORING_CONSTANTS.SURFACE_EXCELLENT_THRESHOLD)
      score += SCORING_CONSTANTS.SURFACE_EXCELLENT_BONUS;
    else if (apt >= SCORING_CONSTANTS.SURFACE_GOOD_THRESHOLD)
      score += SCORING_CONSTANTS.SURFACE_GOOD_BONUS;
    else score += SCORING_CONSTANTS.SURFACE_BAD_PENALTY;
  }

  // Track geometry match
  score += calculateTrackGeometryScore(horse, race);

  // Gradient match
  score += calculateGradientScore(horse, race);

  // Purse appeal - modified by personality
  const baseAppeal = BASE_PURSE_APPEAL[stable.tier] || SCORING_CONSTANTS.DEFAULT_PURSE_APPEAL;
  const purseThreshold = baseAppeal * personality.purseThresholdMod;
  if (race.purse >= purseThreshold * SCORING_CONSTANTS.PURSE_HIGH_MULTIPLIER) {
    score += SCORING_CONSTANTS.PURSE_HIGH_BONUS * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold) {
    score += SCORING_CONSTANTS.PURSE_MEDIUM_BONUS * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold * SCORING_CONSTANTS.PURSE_LOW_MULTIPLIER) {
    score += SCORING_CONSTANTS.PURSE_LOW_BONUS * personality.raceEntryMod;
  }

  // Youth preference - developers like young horses, win-now likes proven
  if (
    horse.age <= SCORING_CONSTANTS.YOUNG_HORSE_AGE &&
    personality.youthPreference > SCORING_CONSTANTS.YOUTH_PREFERENCE_HIGH
  ) {
    score += SCORING_CONSTANTS.YOUTH_BONUS; // Bonus for young horses with developer personality
  } else if (
    horse.age >= SCORING_CONSTANTS.PROVEN_HORSE_AGE &&
    personality.youthPreference < SCORING_CONSTANTS.YOUTH_PREFERENCE_LOW
  ) {
    score += SCORING_CONSTANTS.YOUTH_BONUS; // Bonus for proven horses with win-now personality
  }

  // Form bonus/penalty - aggressive stables ignore form more
  if (horse.form > SCORING_CONSTANTS.FORM_GOOD_THRESHOLD) {
    score += SCORING_CONSTANTS.FORM_GOOD_BONUS;
  } else if (horse.form < SCORING_CONSTANTS.FORM_BAD_THRESHOLD) {
    score -=
      SCORING_CONSTANTS.FORM_BAD_PENALTY_BASE *
      (SCORING_CONSTANTS.FORM_TOLERANCE_BASE - personality.riskTolerance); // Conservative stables penalize bad form more
  }

  // Energy bonus/penalty
  if (horse.energy > SCORING_CONSTANTS.ENERGY_HIGH_THRESHOLD) {
    score += SCORING_CONSTANTS.ENERGY_HIGH_BONUS;
  } else if (horse.energy < MIN_ENERGY_TO_ENTER) {
    score += SCORING_CONSTANTS.ENERGY_LOW_PENALTY;
  }

  // Fame bonus for big races
  if (
    horse.fame > SCORING_CONSTANTS.FAME_HIGH_THRESHOLD &&
    race.purse > SCORING_CONSTANTS.FAME_PURSE_THRESHOLD
  ) {
    score +=
      SCORING_CONSTANTS.FAME_PURSE_BONUS *
      (personality.gradedRaceBonus / SCORING_CONSTANTS.G1_BONUS_BASE);
  }

  // Graded race bonus - heavily modified by personality
  if (race.graded?.grade === "G1") {
    score +=
      SCORING_CONSTANTS.G1_BONUS_BASE +
      personality.gradedRaceBonus * SCORING_CONSTANTS.GRADED_BONUS_MULTIPLIER;
  } else if (race.graded?.grade === "G2") {
    score +=
      SCORING_CONSTANTS.G2_BONUS_BASE +
      personality.gradedRaceBonus * SCORING_CONSTANTS.GRADED_BONUS_MULTIPLIER;
  } else if (race.graded?.grade === "G3") {
    score +=
      SCORING_CONSTANTS.G3_BONUS_BASE +
      personality.gradedRaceBonus * SCORING_CONSTANTS.GRADED_BONUS_MULTIPLIER;
  }

  // Claiming race logic - trader personality loves claiming races
  if (race.claimingPrice) {
    if (stable.personality === "trader") {
      score += SCORING_CONSTANTS.CLAIMING_TRADER_BONUS; // Traders actively seek claiming opportunities
    } else {
      score += SCORING_CONSTANTS.CLAIMING_OTHER_PENALTY; // Other personalities avoid claiming risk
    }

    const suggestedRange = getSuggestedClaimingPriceRange(horse);
    if (suggestedRange) {
      if (race.claimingPrice > suggestedRange[1]) {
        score -= SCORING_CONSTANTS.CLAIMING_OVERQUALIFIED_PENALTY; // Heavy penalty for over-qualified horses
      } else if (race.claimingPrice >= suggestedRange[0]) {
        score += SCORING_CONSTANTS.CLAIMING_QUALIFIED_BONUS; // Bonus for horses in the claiming range
      }
    }

    if (race.raceClass === "Claiming" || race.raceClass === "MaidenClaiming") {
      score += SCORING_CONSTANTS.CLAIMING_FLEXIBILITY_BONUS; // Slight bonus for flexibility
    }
  }

  // Bonus for horses trying to move up from claiming company
  if (race.graded || race.raceClass === "Stakes") {
    const hasClaimingHistory = horse.raceHistory.some(
      (r) => r.purse && r.purse < SCORING_CONSTANTS.CLAIMING_HISTORY_THRESHOLD,
    );
    if (hasClaimingHistory) {
      score += SCORING_CONSTANTS.CLAIMING_HISTORY_BONUS; // Bonus for horses trying to move up from claiming company
    }
  }

  return score;
}

/**
 * Calculate the assigned weight for a horse in a specific race.
 *
 * Includes Sex Allowance (females carry less) and Weight-for-Age
 * (younger horses carry less). Base weight for major races is 126 lbs (57kg).
 *
 * @param horse - The horse to calculate weight for
 * @param race - The race with weight conditions
 * @returns Assigned weight in pounds
 *
 * @example
 * const weight = calculateAssignedWeight(horse, race);
 */
export function calculateAssignedWeight(horse: Horse, race: Race): number {
  // Base weight for major races is 126 lbs (57kg)
  let weight = SCORING_CONSTANTS.BASE_WEIGHT_LBS;

  // Sex Allowance: Fillies and Mares carry 3-5 lbs less in mixed races
  const isMixedRace =
    !race.restrictions?.gender ||
    (!race.restrictions.gender.toLowerCase().includes("filly") &&
      !race.restrictions.gender.toLowerCase().includes("mare") &&
      !race.restrictions.gender.toLowerCase().includes("colt"));

  if (isMixedRace && isFemaleHorse(horse.gender)) {
    weight -= SCORING_CONSTANTS.SEX_ALLOWANCE_LBS; // 3 lb sex allowance
  }

  // Weight-for-Age: 3yos carry less than older horses in open races
  if (
    horse.age === SCORING_CONSTANTS.YOUNG_HORSE_AGE &&
    (race.restrictions?.minAge === undefined ||
      race.restrictions.minAge < SCORING_CONSTANTS.YOUNG_HORSE_AGE)
  ) {
    weight -= SCORING_CONSTANTS.AGE_ALLOWANCE_LBS; // 2 lb age allowance
  }

  // Handicap adjustment (if applicable)
  if (race.isHandicap && race.handicapWeights) {
    const hw = race.handicapWeights.find((w) => w.horseId === horse.id);
    if (hw) return hw.weight;
  }

  return weight;
}
