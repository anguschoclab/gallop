import type { Horse, Race } from "@/game/types";
import type { Hemisphere } from "@/game/types";
import { isGenderEligible as checkGenderEligibility } from "@/core/horse/gender";
import { calculateOverallRating } from "@/core/horse/stats";

/**
 * Pure race eligibility checking logic
 * Extracted from: races.tsx (lines 113-127, 452-466), store.ts (lines 141-149)
 */

/**
 * Get the minimum age for a horse based on hemisphere and race restrictions
 * Northern hemisphere: age matches calendar year
 * Southern hemisphere: age is calendar year - 1
 */
export function getMinimumAgeForHemisphere(
  horseHemisphere: Hemisphere,
  restrictions?: { minAge?: number }
): number {
  const baseAge = restrictions?.minAge ?? 2;
  return horseHemisphere === "Southern" ? baseAge + 1 : baseAge;
}

/**
 * Check if a horse is eligible to enter a race
 * Considers age, gender restrictions, energy, and pregnancy status
 */
export function isHorseEligibleForRace(
  horse: Horse,
  race: Race,
  pregnantHorseIds: Set<string>
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
    const restriction = race.restrictions.gender.toLowerCase().includes("colt") 
      ? "colt" as const
      : race.restrictions.gender.toLowerCase().includes("filly")
      ? "filly" as const
      : undefined;
    if (restriction && !checkGenderEligibility(horse.gender, restriction)) {
      return false;
    }
  }

  // Check energy
  if (horse.energy < 15) {
    return false;
  }

  // Check pregnancy
  if (pregnantHorseIds.has(horse.id)) {
    return false;
  }

  // Check if horse already entered
  if (race.entries.some((entry) => entry.horseId === horse.id)) {
    return false;
  }

  return true;
}
