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
import { isHorseEligibleForClaimingPrice, getSuggestedClaimingPriceRange } from "@/game/claiming";
import { calculateTrackGeometryScore, calculateGradientScore } from "./trackGeometry";

// Entry limits per stable per race
export const MAX_HORSES_PER_STABLE_PER_RACE = 2;

// Energy threshold for entering races
export const MIN_ENERGY_TO_ENTER = 50;

// Form consideration - prefer positive form
export const MIN_FORM_TO_ENTER = -3;

// Distance preference - horses prefer races within this range of their "best" distance
export const PREFERRED_DISTANCE_RANGE = 300; // ±300m from ideal

// Base purse appeal thresholds by tier (modified by personality)
export const BASE_PURSE_APPEAL: Record<StableTier, number> = {
  elite: 100000,
  mid: 25000,
  budget: 5000,
};

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
    if (gap >= -5 && gap <= 10) {
      score += 30;
    } else if (gap > 10) {
      score += (20 - gap) * riskTolerance; // Risk-takers still enter overqualified
    } else {
      score += gap * riskTolerance; // Risk-takers may enter underqualified
    }
  } else {
    score += 20;
  }

  // Distance fit - use horse's personal aptitude
  const distDiff = Math.abs(race.distance - horse.distanceAptitude);
  if (distDiff <= 100) score += 30;
  else if (distDiff <= 300) score += 15;
  else if (distDiff <= 600) score += 5;
  else score -= 15;

  // Surface fit - use horse's personal aptitude
  const surface = race.surface || race.graded?.surface;
  if (surface) {
    const apt = horse.surfaceAptitude[surface] ?? 0.95;
    if (apt >= 1.0) score += 20;
    else if (apt >= 0.95) score += 5;
    else score -= 20;
  }

  // Track geometry match
  score += calculateTrackGeometryScore(horse, race);

  // Gradient match
  score += calculateGradientScore(horse, race);

  // Purse appeal - modified by personality
  const baseAppeal = BASE_PURSE_APPEAL[stable.tier] || 10000;
  const purseThreshold = baseAppeal * personality.purseThresholdMod;
  if (race.purse >= purseThreshold * 2) {
    score += 25 * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold) {
    score += 15 * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold * 0.5) {
    score += 5 * personality.raceEntryMod;
  }

  // Youth preference - developers like young horses, win-now likes proven
  if (horse.age <= 3 && personality.youthPreference > 0.7) {
    score += 10; // Bonus for young horses with developer personality
  } else if (horse.age >= 5 && personality.youthPreference < 0.3) {
    score += 10; // Bonus for proven horses with win-now personality
  }

  // Form bonus/penalty - aggressive stables ignore form more
  const formTolerance = personality.riskTolerance;
  if (horse.form > 3) {
    score += 10;
  } else if (horse.form < -3) {
    score -= 10 * (2 - formTolerance); // Conservative stables penalize bad form more
  }

  // Energy check
  if (horse.energy > 80) {
    score += 5;
  } else if (horse.energy < MIN_ENERGY_TO_ENTER) {
    score -= 20;
  }

  // Fame/recognition - prestige stables love famous horses in big races
  if (horse.fame > 50 && race.purse > 100000) {
    score += 10 * (personality.gradedRaceBonus / 20);
  }

  // Graded race bonus - heavily modified by personality
  if (race.graded?.grade === "G1") {
    score += 15 + personality.gradedRaceBonus * 0.5;
  } else if (race.graded?.grade === "G2") {
    score += 10 + personality.gradedRaceBonus * 0.3;
  } else if (race.graded?.grade === "G3") {
    score += 5 + personality.gradedRaceBonus * 0.2;
  }

  // Claiming race logic - trader personality loves claiming races
  if (race.claimingPrice) {
    if (stable.personality === "trader") {
      score += 20; // Traders actively seek claiming opportunities
    } else {
      score -= 5; // Other personalities avoid claiming risk
    }

    // Check if horse is appropriately priced for claiming level
    const isEligible = isHorseEligibleForClaimingPrice(horse, race.claimingPrice, []);
    if (!isEligible) {
      score -= 30; // Heavy penalty for over-qualified horses
    } else {
      // Bonus for well-matched claiming prices
      const [minPrice, maxPrice] = getSuggestedClaimingPriceRange(horse);
      if (race.claimingPrice >= minPrice && race.claimingPrice <= maxPrice) {
        score += 10;
      }
    }
  }

  // Optional claiming - good middle ground
  if (race.raceClass === "OptionalClaiming") {
    score += 5; // Slight bonus for flexibility
  }

  // Starter allowance/starter handicap - good for horses moving up
  if (race.raceClass === "StarterAllowance" || race.raceClass === "StarterHandicap") {
    // Check if horse has claiming race history
    const hasClaimingHistory = horse.raceHistory.some((r) => r.purse && r.purse < 10000);
    if (hasClaimingHistory) {
      score += 15; // Bonus for horses trying to move up from claiming company
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
  let weight = 126;

  // Sex Allowance: Fillies and Mares carry 3-5 lbs less in mixed races
  const isMixedRace =
    !race.restrictions?.gender ||
    (!race.restrictions.gender.toLowerCase().includes("filly") &&
      !race.restrictions.gender.toLowerCase().includes("mare") &&
      !race.restrictions.gender.toLowerCase().includes("colt"));

  if (isMixedRace && isFemaleHorse(horse.gender)) {
    weight -= 3; // 3 lb sex allowance
  }

  // Weight-for-Age: 3yos carry less than older horses in open races
  if (
    horse.age === 3 &&
    (race.restrictions?.minAge === undefined || race.restrictions.minAge < 3)
  ) {
    weight -= 2; // 2 lb age allowance
  }

  // Handicap adjustment (if applicable)
  if (race.isHandicap && race.handicapWeights) {
    const hw = race.handicapWeights.find((w) => w.horseId === horse.id);
    if (hw) return hw.weight;
  }

  return weight;
}
