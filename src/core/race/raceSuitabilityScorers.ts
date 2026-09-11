/**
 * raceSuitabilityScorers.ts - Individual scoring components for race suitability.
 *
 * Extracts the 13 scoring sections from calculateRaceSuitability into a registry
 * of small, pure, <20-line scorers. The coordinator (calculateRaceSuitability)
 * sums the results in registry order.
 *
 * Per PR 6 of the megaplan: flattens conditional chains via dictionary mapping.
 *
 * Dependencies: @/game/types, @/core/horse/stats, @/core/stable/stableConfig,
 *              @/core/market/claiming, ./trackGeometry
 * Related files: ./entryScoring.ts (coordinator)
 */

import type { Horse, Race, Stable } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { getSuggestedClaimingPriceRange } from "@/core/market/claiming";
import { calculateTrackGeometryScore, calculateGradientScore } from "./trackGeometry";
import {
  pickAtMostTier,
  pickAtLeastTier,
  DISTANCE_FIT_TIERS,
  SURFACE_FIT_TIERS,
  BASE_PURSE_APPEAL,
  SCORING_CONSTANTS,
  GRADED_BONUS_BASE,
} from "./entryScoringConstants";

/** Scoring context passed to each scorer. */
export interface SuitabilityContext {
  horse: Horse;
  race: Race;
  stable: Stable;
  personality: (typeof PERSONALITY_CONFIG)[Stable["personality"]];
  overall: number;
}

/** A scorer computes one component of the race suitability score. */
export type SuitabilityScorer = (ctx: SuitabilityContext) => number;

const scoreClass: SuitabilityScorer = ({ race, overall, personality }) => {
  if (!race.minStat) return SCORING_CONSTANTS.CLASS_UNDERQUALIFIED_BONUS;
  const gap = overall - race.minStat;
  if (gap >= SCORING_CONSTANTS.CLASS_GAP_MIN && gap <= SCORING_CONSTANTS.CLASS_GAP_MAX)
    return SCORING_CONSTANTS.CLASS_OVERQUALIFIED_BONUS;
  if (gap > SCORING_CONSTANTS.CLASS_GAP_MAX)
    return (SCORING_CONSTANTS.CLASS_OVERQUALIFIED_PENALTY_BASE - gap) * personality.riskTolerance;
  return gap * personality.riskTolerance;
};

const scoreDistance: SuitabilityScorer = ({ horse, race }) => {
  const distDiff = Math.abs(race.distance - horse.distanceAptitude);
  return pickAtMostTier(distDiff, DISTANCE_FIT_TIERS, SCORING_CONSTANTS.DIST_BAD_PENALTY);
};

const scoreSurface: SuitabilityScorer = ({ horse, race }) => {
  const surface = race.surface || race.graded?.surface;
  if (!surface) return 0;
  const apt = horse.surfaceAptitude[surface] ?? SCORING_CONSTANTS.SURFACE_GOOD_THRESHOLD;
  return pickAtLeastTier(apt, SURFACE_FIT_TIERS, SCORING_CONSTANTS.SURFACE_BAD_PENALTY);
};

const scoreTrackGeometry: SuitabilityScorer = ({ horse, race }) =>
  calculateTrackGeometryScore(horse, race);

const scoreGradient: SuitabilityScorer = ({ horse, race }) => calculateGradientScore(horse, race);

const scorePurse: SuitabilityScorer = ({ race, stable, personality }) => {
  const baseAppeal = BASE_PURSE_APPEAL[stable.tier] || SCORING_CONSTANTS.DEFAULT_PURSE_APPEAL;
  const threshold = baseAppeal * personality.purseThresholdMod;
  if (race.purse >= threshold * SCORING_CONSTANTS.PURSE_HIGH_MULTIPLIER)
    return SCORING_CONSTANTS.PURSE_HIGH_BONUS * personality.raceEntryMod;
  if (race.purse >= threshold)
    return SCORING_CONSTANTS.PURSE_MEDIUM_BONUS * personality.raceEntryMod;
  if (race.purse >= threshold * SCORING_CONSTANTS.PURSE_LOW_MULTIPLIER)
    return SCORING_CONSTANTS.PURSE_LOW_BONUS * personality.raceEntryMod;
  return 0;
};

const scoreYouth: SuitabilityScorer = ({ horse, personality }) => {
  if (
    horse.age <= SCORING_CONSTANTS.YOUNG_HORSE_AGE &&
    personality.youthPreference > SCORING_CONSTANTS.YOUTH_PREFERENCE_HIGH
  )
    return SCORING_CONSTANTS.YOUTH_BONUS;
  if (
    horse.age >= SCORING_CONSTANTS.PROVEN_HORSE_AGE &&
    personality.youthPreference < SCORING_CONSTANTS.YOUTH_PREFERENCE_LOW
  )
    return SCORING_CONSTANTS.YOUTH_BONUS;
  return 0;
};

const scoreForm: SuitabilityScorer = ({ horse, personality }) => {
  if (horse.form > SCORING_CONSTANTS.FORM_GOOD_THRESHOLD) return SCORING_CONSTANTS.FORM_GOOD_BONUS;
  if (horse.form < SCORING_CONSTANTS.FORM_BAD_THRESHOLD)
    return (
      -SCORING_CONSTANTS.FORM_BAD_PENALTY_BASE *
      (SCORING_CONSTANTS.FORM_TOLERANCE_BASE - personality.riskTolerance)
    );
  return 0;
};

const scoreEnergy: SuitabilityScorer = ({ horse }) => {
  if (horse.energy > SCORING_CONSTANTS.ENERGY_HIGH_THRESHOLD)
    return SCORING_CONSTANTS.ENERGY_HIGH_BONUS;
  if (horse.energy < SCORING_CONSTANTS.MIN_ENERGY_TO_ENTER_VALUE)
    return SCORING_CONSTANTS.ENERGY_LOW_PENALTY;
  return 0;
};

const scoreFame: SuitabilityScorer = ({ horse, race, personality }) => {
  if (
    horse.fame > SCORING_CONSTANTS.FAME_HIGH_THRESHOLD &&
    race.purse > SCORING_CONSTANTS.FAME_PURSE_THRESHOLD
  )
    return (
      SCORING_CONSTANTS.FAME_PURSE_BONUS *
      (personality.gradedRaceBonus / SCORING_CONSTANTS.G1_BONUS_BASE)
    );
  return 0;
};

const scoreGraded: SuitabilityScorer = ({ race, personality }) => {
  const grade = race.graded?.grade;
  if (!grade) return 0;
  const base = GRADED_BONUS_BASE[grade] ?? SCORING_CONSTANTS.OTHER_BONUS_BASE;
  return base + personality.gradedRaceBonus * SCORING_CONSTANTS.GRADED_BONUS_MULTIPLIER;
};

const scoreClaiming: SuitabilityScorer = ({ horse, race, stable }) => {
  if (!race.claimingPrice) return 0;
  let s =
    stable.personality === "trader"
      ? SCORING_CONSTANTS.CLAIMING_TRADER_BONUS
      : SCORING_CONSTANTS.CLAIMING_OTHER_PENALTY;
  const range = getSuggestedClaimingPriceRange(horse);
  if (range) {
    if (race.claimingPrice > range[1]) s -= SCORING_CONSTANTS.CLAIMING_OVERQUALIFIED_PENALTY;
    else if (race.claimingPrice >= range[0]) s += SCORING_CONSTANTS.CLAIMING_QUALIFIED_BONUS;
  }
  if (race.raceClass === "Claiming" || race.raceClass === "MaidenClaiming")
    s += SCORING_CONSTANTS.CLAIMING_FLEXIBILITY_BONUS;
  return s;
};

const scoreClaimingHistory: SuitabilityScorer = ({ horse, race }) => {
  if (!race.graded && race.raceClass !== "Stakes") return 0;
  const hasClaimingHistory = horse.raceHistory.some(
    (r) => r.purse && r.purse < SCORING_CONSTANTS.CLAIMING_HISTORY_THRESHOLD,
  );
  return hasClaimingHistory ? SCORING_CONSTANTS.CLAIMING_HISTORY_BONUS : 0;
};

/** Ordered registry of scorers — sum in order to get total suitability. */
export const SUITABILITY_SCORERS: SuitabilityScorer[] = [
  scoreClass,
  scoreDistance,
  scoreSurface,
  scoreTrackGeometry,
  scoreGradient,
  scorePurse,
  scoreYouth,
  scoreForm,
  scoreEnergy,
  scoreFame,
  scoreGraded,
  scoreClaiming,
  scoreClaimingHistory,
];

/**
 * Build the scoring context for a horse/race/stable triple.
 * @param horse
 * @param race
 * @param stable
 */
export function buildSuitabilityContext(
  horse: Horse,
  race: Race,
  stable: Stable,
): SuitabilityContext {
  return {
    horse,
    race,
    stable,
    personality: PERSONALITY_CONFIG[stable.personality],
    overall: calculateOverallRating(horse),
  };
}
