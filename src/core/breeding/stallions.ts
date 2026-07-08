/**
 * stallions.ts - Stallion management and stud fee calculation
 *
 * This file provides functions for determining stallion eligibility, calculating
 * stud fees, and managing stallion retirement decisions. It handles both player
 * and NPC stallions with tier-based defaults.
 *
 * Dependencies: @/game/types (Horse, Hemisphere, GameState, StableTier, Stable), @/core/calendar/breedingCalendar (inBreedingSeason), @/core/horse/pricing (calculateBaseHorseValue), @/core/horse/gender (isMaleHorse)
 * Related files: horseFactory.ts (uses shouldRetireAtStartup), pricing.ts (base value calculation)
 */

import type { Horse, Hemisphere, GameState, StableTier } from "@/game/types";
import type { Stable } from "@/game/types";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import { calculateBaseHorseValue } from "@/core/horse/pricing";
import { isMaleHorse } from "@/core/horse/gender";
import { getCareerStats } from "@/core/horse/stats";
import {
  STUD_FEE_MID,
  STUD_BOOK_SIZE_MID,
  STUD_FEE_ROUNDING,
  STUD_FEE_MIN,
  AGE_STUD_DECLINE,
  AGE_STUD_SEVERE_DECLINE,
} from "@/constants";

const SIRE_GENDERS: Horse["gender"][] = ["colt", "horse"];

// Tier-driven defaults for retirement-to-stud parameters. Numbers chosen so
// that elite stallions are scarce, expensive, and command large books — and
// budget stallions remain available cheap for low-tier players.
const STUD_DEFAULTS: Record<StableTier, { fee: number; bookSize: number }> = {
  elite: { fee: 75000, bookSize: 180 },
  mid: { fee: STUD_FEE_MID, bookSize: STUD_BOOK_SIZE_MID },
  budget: { fee: 2500, bookSize: 80 },
};

/**
 * Get default stud parameters for a stable tier.
 *
 * Returns the default standing fee and book size for a given stable tier.
 * Used for NPC stallions and as a baseline for player stallions.
 *
 * @param tier - The stable tier (defaults to "budget" if undefined)
 * @returns Object with fee and bookSize
 *
 * @example
 * const params = defaultStudParams("elite");
 * // Returns { fee: 75000, bookSize: 180 }
 */
export function defaultStudParams(tier: StableTier | undefined): { fee: number; bookSize: number } {
  return STUD_DEFAULTS[tier ?? "budget"];
}

/**
 * Determine if an NPC horse should retire to stud at world generation.
 *
 * Tier-driven proportions: elite stables retire all male 5+ horses to stud,
 * mid retire most, budget retire some. Player horses never start at stud —
 * that's the player's call via the retireToStud action.
 *
 * @param horse - The horse to evaluate
 * @param stable - The stable the horse belongs to
 * @returns True if the horse should retire to stud at startup
 *
 * @example
 * if (shouldRetireAtStartup(horse, stable)) {
 *   horse.stud = { atStud: true, standingFee: ..., maxBookSize: ... };
 * }
 */
export function shouldRetireAtStartup(horse: Horse, stable: Stable | undefined): boolean {
  if (!stable) return false;
  if (!isMaleHorse(horse.gender)) return false;
  if (horse.age < 5) return false;
  if (stable.tier === "elite") return true;
  if (stable.tier === "mid") return horse.age >= 6;
  return horse.age >= 7;
}

/**
 * Determine if a horse is suitable for standing at stud.
 *
 * NPC stallions are retired based on performance and fame. G1 winners are
 * highly likely to stand at stud. This function evaluates whether a horse
 * meets the criteria for stallion material based on race performance and fame.
 *
 * @param horse - The horse to evaluate
 * @returns True if the horse is suitable for standing at stud
 *
 * @example
 * if (isStallionMaterial(horse)) {
 *   considerForStud(horse);
 * }
 */
export function isStallionMaterial(horse: Horse): boolean {
  if (!isMaleHorse(horse.gender)) return false;

  // Basic track performance criteria
  const careerStats = getCareerStats(horse);
  const hasG1Win = careerStats.g1Wins > 0;
  const hasGradedWin =
    careerStats.g2Wins > 0 || careerStats.g3Wins > 0 || careerStats.stakesWins > 0;

  // Elite performers or very famous ones
  if (hasG1Win) return true;
  if (hasGradedWin && horse.fame > 60) return true;
  if (horse.fame > 80) return true;

  return false;
}

/**
 * Recommended initial stud fee for a horse based on performance and value.
 *
 * Used for both player and NPC retirement. Calculates a fee based on the horse's
 * market value, weighted heavily by G1 wins and graded stakes performance.
 *
 * @param horse - The horse to calculate the fee for
 * @param stableOrTier - Optional stable for tier context, or tier directly
 * @returns Recommended stud fee in dollars
 *
 * @example
 * const fee = calculateRecommendedStudFee(horse, stable);
 * const fee2 = calculateRecommendedStudFee(horse, "elite");
 */
export function calculateRecommendedStudFee(
  horse: Horse,
  stableOrTier?: Stable | StableTier,
): number {
  const tier = typeof stableOrTier === "string" ? stableOrTier : stableOrTier?.tier || "mid";
  const baseValue = calculateBaseHorseValue(horse, tier);

  // Calculate win frequency and quality
  const cs = getCareerStats(horse);
  const g1Wins = cs.g1Wins;
  const gradedWins = cs.gradedWins;
  const totalWins = cs.wins;

  // Base fee is ~5-10% of market value, but weighted heavily by G1 wins
  let fee = baseValue * 0.1;

  if (g1Wins > 0) {
    fee += g1Wins * 10000;
  }

  if (gradedWins > 0) {
    fee += (gradedWins - g1Wins) * 3500;
  }

  // Bonus for overall win record
  if (totalWins > 5) {
    fee *= 1.2;
  }

  // Progeny performance impact (for established sires)
  if (horse.stud && horse.stud.lifetimeFoals > 10) {
    const stakesRate = horse.stud.lifetimeStakesFoals / horse.stud.lifetimeFoals;
    if (stakesRate > 0.05) fee += 5000;
    if (stakesRate > 0.1) fee += 10000;
  }

  // Round to nearest $100
  return Math.round(fee / STUD_FEE_ROUNDING) * STUD_FEE_ROUNDING;
}

/**
 * Alias for calculateRecommendedStudFee for backward compatibility.
 */


/**
 * Recalculate standing fee after new progeny results or major wins.
 *
 * Adjusts the stallion's fee based on progeny performance stakes rate and G1 winners.
 * Fees increase with successful progeny and decrease with age.
 *
 * @param horse - The stallion horse
 * @param currentDay - Current game day
 * @returns Recalculated standing fee in dollars
 *
 * @example
 * const newFee = recalcStandingFee(stallion, currentDay);
 */
export function recalcStandingFee(horse: Horse, currentDay: number): number {
  if (!horse.stud || !horse.stud.atStud) return 0;

  const currentFee = horse.stud.standingFee;
  let multiplier = 1.0;

  // Own performance impact (for recently retired stallions with few progeny)
  const careerStats = getCareerStats(horse);
  if (horse.stud.lifetimeFoals < 20) {
    if (careerStats.g1Wins > 0) multiplier += 0.15;
    if (careerStats.stakesWins > 0) multiplier += 0.1;
  }

  // Progeny performance impact
  const stakesRate =
    horse.stud.lifetimeFoals > 0 ? horse.stud.lifetimeStakesFoals / horse.stud.lifetimeFoals : 0;

  if (stakesRate > 0.1) multiplier += 0.25;
  if (stakesRate > 0.05) multiplier += 0.1;

  // Recent crop G1 win impact
  // (In a real system we'd track last update day, for now we just look at lifetime counts)
  if (horse.stud.lifetimeG1Foals > 2) multiplier += 0.5;

  // Aging impact: fee drops after age 15
  if (horse.age > AGE_STUD_DECLINE) multiplier -= 0.1;
  if (horse.age > AGE_STUD_SEVERE_DECLINE) multiplier -= 0.15;

  // Round to nearest $100
  return Math.max(
    STUD_FEE_MIN,
    Math.round((currentFee * multiplier) / STUD_FEE_ROUNDING) * STUD_FEE_ROUNDING,
  );
}

/**
 * valueOf — current financial value of the stallion to the stable.
 *
 * Used for taxes, accounting, and AI buy/sell decisions. Calculates the stallion's
 * total value as base horse value plus stud income potential (valued at 2 years of stud revenue).
 *
 * @param horse - The stallion horse
 * @param stable - The stable owning the horse
 * @returns Total financial value in dollars
 *
 * @example
 * const value = valueOf(stallion, stable);
 */
export function valueOf(horse: Horse, stable: Stable): number {
  const baseValue = calculateBaseHorseValue(horse, stable.tier);

  if (!horse.stud || !horse.stud.atStud) return baseValue;

  // Stud value is heavily influenced by their book size and fee
  const annualStudRevenue = horse.stud.standingFee * horse.stud.bookSize * 0.7; // 70% fill rate

  return baseValue + annualStudRevenue * 2; // Valued at base + 2 years of stud income
}

/**
 * Get available stallions for breeding with a specific mare.
 *
 * Filters all horses to find stallions that are available for breeding with the given mare.
 * Considers gender, stud status, and basic eligibility criteria.
 *
 * @param horses - All horses in the game state
 * @param mare - Optional mare to breed with
 * @returns Array of available stallions
 *
 * @example
 * const stallions = getAvailableStallions(state.horses, mare);
 */
export function getAvailableStallions(horses: Horse[], mare?: Horse): Horse[] {
  return horses.filter((horse) => {
    // Must be a male horse
    if (!SIRE_GENDERS.includes(horse.gender)) return false;

    // Must be at stud
    if (!horse.stud || !horse.stud.atStud) return false;

    // Must be alive
    if (horse.lifecycleStatus === "deceased") return false;

    // Must be of breeding age
    if (horse.age < 3) return false;

    // Cannot breed with itself
    if (mare && horse.id === mare.id) return false;

    // Basic health check
    if (horse.healthStatus === "covering_sickness") return false;

    return true;
  });
}

/**
 * Check if a stallion is available for breeding on a given day.
 *
 * Considers stud status, breeding season, and booking availability.
 *
 * @param stallion - The stallion horse
 * @param day - Current game day
 * @returns True if the stallion is available for breeding
 *
 * @example
 * if (isStallionAvailable(stallion, currentDay)) {
 *   bookBreeding(stallion);
 * }
 */
export function isStallionAvailable(stallion: Horse, day: number): boolean {
  // Must be at stud
  if (!stallion.stud || !stallion.stud.atStud) return false;

  // Must be alive
  if (stallion.lifecycleStatus === "deceased") return false;

  // Must be in breeding season
  if (!inBreedingSeason(day, stallion.hemisphere)) return false;

  // Must have available booking slots
  if (stallion.stud.seasonBookings >= stallion.stud.bookSize) return false;

  // Basic health check
  if (stallion.healthStatus === "covering_sickness") return false;

  return true;
}
