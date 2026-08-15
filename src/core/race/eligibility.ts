/**
 * eligibility.ts - Race eligibility checking logic
 *
 * This file provides pure functions for checking whether a horse is eligible
 * to enter a race based on age, gender, energy, pregnancy status, and win conditions.
 *
 * Dependencies: @/game/types (Horse, Race, Hemisphere), @/core/horse/gender (isGenderEligible), @/core/horse/stats (calculateOverallRating)
 * Related files: raceSim.ts (uses eligibility checks), store.ts (race entry validation)
 */

import type { Horse, Race } from "@/game/types";
import type { Hemisphere } from "@/game/types";
import { isGenderEligible as checkGenderEligibility } from "@/core/horse/gender";
import { calculateOverallRating } from "@/core/horse/stats";
import { getCurrentYear } from "@/core/race/schedule";
import {
  DEFAULT_MIN_AGE_NORTHERN,
  SOUTHERN_HEMISPHERE_AGE_OFFSET,
  POSITION_WIN,
  MIN_ENERGY_TO_RACE,
} from "@/constants";

/**
 * Pure race eligibility checking logic
 * Extracted from: races.tsx (lines 113-127, 452-466), store.ts (lines 141-149)
 */

/**
 * Get the minimum age for a horse based on hemisphere and race restrictions.
 *
 * Northern hemisphere: age matches calendar year.
 * Southern hemisphere: age is calendar year - 1.
 *
 * @param horseHemisphere - The horse's hemisphere
 * @param restrictions - Optional race restrictions
 * @param restrictions.minAge - General minimum age
 * @param restrictions.minAgeNorthern - Minimum age override for Northern hemisphere
 * @param restrictions.minAgeSouthern - Minimum age override for Southern hemisphere
 * @returns Minimum age for the horse to be eligible
 *
 * @example
 * const minAge = getMinimumAgeForHemisphere("Northern", race.restrictions);
 */
export function getMinimumAgeForHemisphere(
  horseHemisphere: Hemisphere,
  restrictions?: { minAge?: number; minAgeNorthern?: number; minAgeSouthern?: number },
): number {
  // Use hemisphere-specific age if available
  if (horseHemisphere === "Northern" && restrictions?.minAgeNorthern !== undefined) {
    return restrictions.minAgeNorthern;
  }
  if (horseHemisphere === "Southern" && restrictions?.minAgeSouthern !== undefined) {
    return restrictions.minAgeSouthern;
  }
  // Fall back to general minAge
  const baseAge = restrictions?.minAge ?? DEFAULT_MIN_AGE_NORTHERN;
  return horseHemisphere === "Southern" ? baseAge + SOUTHERN_HEMISPHERE_AGE_OFFSET : baseAge;
}

/**
 * Check if a horse is invited to an invitation-only race.
 *
 * Horses are invited if they appear in race.invitedHorseIds or have a
 * matching Win-and-You're-In qualification for the current year.
 * @param horse
 * @param race
 * @param currentDay
 */
export function isHorseInvitedToRace(horse: Horse, race: Race, currentDay: number): boolean {
  // Not an invite-only race → always "invited"
  if (!race.graded?.requiresInvitation) return true;

  // Direct invitation
  const invitedIds = race.invitedHorseIds ?? race.graded?.invitedHorseIds ?? [];
  if (invitedIds.includes(horse.id)) return true;

  // Win-and-You're-In automatic qualification
  const raceKey = race.graded?.key;
  if (raceKey && horse.winAndYouInQualified) {
    const currentYear = getCurrentYear(currentDay);
    if (horse.winAndYouInQualified.some((q) => q.raceKey === raceKey && q.year === currentYear)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a horse is eligible to enter a race.
 *
 * Considers age, gender restrictions, energy, pregnancy status, maiden status,
 * and win conditions (N3L, N1X, N2X).
 *
 * @param horse - The horse to check
 * @param race - The race to enter
 * @param pregnantHorseIds - Set of pregnant horse IDs
 * @param currentDay
 * @returns True if the horse is eligible for the race
 *
 * @example
 * const eligible = isHorseEligibleForRace(horse, race, pregnantHorseIds);
 */
export function isHorseEligibleForRace(
  horse: Horse,
  race: Race,
  pregnantHorseIds: Set<string>,
  currentDay?: number,
): boolean {
  // Check minimum stat requirement
  if (race.minStat && calculateOverallRating(horse) < race.minStat) {
    return false;
  }

  // Check age restrictions
  const minAge = getMinimumAgeForHemisphere(horse.hemisphere, race.restrictions);
  if (horse.age < minAge) {
    return false;
  }

  // Check maximum age restriction
  if (race.restrictions?.maxAge && horse.age > race.restrictions.maxAge) {
    return false;
  }

  // Check gender restrictions
  if (race.restrictions?.gender) {
    if (!checkGenderEligibility(horse.gender, race.restrictions.gender)) {
      return false;
    }
  }

  // Check energy
  if (horse.energy < MIN_ENERGY_TO_RACE) {
    return false;
  }

  // Check pregnancy
  if (pregnantHorseIds.has(horse.id)) {
    return false;
  }

  // Check Maiden races explicitly (must have 0 wins)
  if (race.raceClass?.toLowerCase().includes("maiden")) {
    const hasWon = horse.raceHistory.some((r) => r.position === POSITION_WIN);
    if (hasWon) return false;
  }

  // Check win conditions
  if (race.winCondition) {
    const allWins = horse.raceHistory.filter((r) => r.position === 1);

    // N3L: Non-winners of 3 races lifetime
    if (race.winCondition === "N3L" && allWins.length >= 3) {
      return false;
    }

    // N1X, N2X: Non-winners of 1 or 2 races "other than maiden, claiming, or starter"
    if (race.winCondition === "N1X" || race.winCondition === "N2X") {
      const conditionWins = allWins.filter((w) => {
        const rc = w.raceClass?.toLowerCase() || "";
        if (rc.includes("maiden") || rc.includes("claiming") || rc.includes("starter")) {
          return false;
        }
        return true;
      });

      if (race.winCondition === "N1X" && conditionWins.length >= 1) return false;
      if (race.winCondition === "N2X" && conditionWins.length >= 2) return false;
    }
  }

  // Check if horse already entered
  if (race.entries.some((entry) => entry.horseId === horse.id)) {
    return false;
  }

  // Check invitation requirement for invite-only races
  if (currentDay !== undefined && !isHorseInvitedToRace(horse, race, currentDay)) {
    return false;
  }

  return true;
}
