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
import { isFemaleHorse } from "@/core/horse/gender";
import { isHorseEligibleForClaimingPrice } from "@/core/market/claiming";
import {
  BASE_RACE_WEIGHT_LBS,
  MAX_HORSES_PER_STABLE_PER_RACE,
  MIN_ENERGY_TO_ENTER,
  MIN_FORM_TO_ENTER,
  PREFERRED_DISTANCE_RANGE,
} from "@/constants";
import { BASE_PURSE_APPEAL, SCORING_CONSTANTS, GRADED_BONUS_BASE } from "./entryScoringConstants";
import { SUITABILITY_SCORERS, buildSuitabilityContext } from "./raceSuitabilityScorers";

// Re-export for existing importers
export { BASE_PURSE_APPEAL, SCORING_CONSTANTS, GRADED_BONUS_BASE };

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
  const ctx = buildSuitabilityContext(horse, race, stable);
  let score = 0;
  for (const scorer of SUITABILITY_SCORERS) {
    score += scorer(ctx);
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
