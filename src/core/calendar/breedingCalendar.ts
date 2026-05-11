/**
 * breedingCalendar.ts - Breeding season and birthday calculations
 *
 * This file provides functions for determining breeding seasons, universal birthdays,
 * and related calendar calculations for Northern and Southern hemispheres.
 *
 * Dependencies: @/game/types (Hemisphere), ./dateFormatting (dayOfYear)
 * Related files: dateFormatting.ts (provides dayOfYear function)
 */

import type { Hemisphere } from "@/game/types";
import { dayOfYear } from "./dateFormatting";

// Real-world breeding seasons (approximate):
//   Northern: Feb 5 (DoY 36) → Jun 16 (DoY 167) — covers Feb-mid-Jun.
//   Southern: Sep 1 (DoY 244) → Dec 16 (DoY 350) — Spring/Summer south of equator.
// These ranges fit within a single calendar year (no wrap), which keeps the
// `inBreedingSeason` check simple. If we ever extend Southern past Dec 31 the
// wrap logic will need revisiting.
export const BREEDING_SEASON: Record<Hemisphere, { startDoy: number; endDoy: number }> = {
  Northern: { startDoy: 36, endDoy: 167 },
  Southern: { startDoy: 244, endDoy: 350 },
};

// Universal birthday: every thoroughbred ages up on a fixed calendar date
// regardless of actual foaling day. Northern: Jan 1; Southern: Aug 1 (DoY 213).
export const UNIVERSAL_BIRTHDAY: Record<Hemisphere, number> = {
  Northern: 1,
  Southern: 213,
};

/**
 * Check if a given day is within the breeding season for a hemisphere.
 *
 * @param day - Absolute game day
 * @param hemisphere - Hemisphere
 * @returns True if in breeding season
 *
 * @example
 * const inSeason = inBreedingSeason(50, "Northern"); // true
 */
export function inBreedingSeason(day: number, hemisphere: Hemisphere): boolean {
  const doy = dayOfYear(day);
  const { startDoy, endDoy } = BREEDING_SEASON[hemisphere];
  return doy >= startDoy && doy <= endDoy;
}

/**
 * Returns the absolute game day on which the next breeding season opens.
 *
 * If currently inside the season, returns the start of this season (today doesn't count as "next").
 *
 * @param day - Absolute game day
 * @param hemisphere - Hemisphere
 * @returns Absolute game day of next breeding season start
 *
 * @example
 * const nextStart = nextBreedingSeasonStart(50, "Northern"); // 36 (start of current season)
 */
export function nextBreedingSeasonStart(day: number, hemisphere: Hemisphere): number {
  const doy = dayOfYear(day);
  const { startDoy } = BREEDING_SEASON[hemisphere];
  const yearOffset = day - doy; // absolute day at DoY 1 of current year
  if (doy < startDoy) return yearOffset + startDoy;
  if (doy > BREEDING_SEASON[hemisphere].endDoy) return yearOffset + 365 + startDoy;
  return yearOffset + startDoy; // we're in season; "next" reads as the current season start
}

/**
 * Check if a given day is the universal birthday for a hemisphere.
 *
 * @param day - Absolute game day
 * @param hemisphere - Hemisphere
 * @returns True if universal birthday
 *
 * @example
 * const birthday = isUniversalBirthday(1, "Northern"); // true (Jan 1)
 */
export function isUniversalBirthday(day: number, hemisphere: Hemisphere): boolean {
  return dayOfYear(day) === UNIVERSAL_BIRTHDAY[hemisphere];
}

/**
 * Check if a given day is the first day of the breeding season.
 *
 * Used to reset stallion book-counters and run NPC mating planning.
 *
 * @param day - Absolute game day
 * @param hemisphere - Hemisphere
 * @returns True if breeding season start
 *
 * @example
 * const start = isBreedingSeasonStart(36, "Northern"); // true (Feb 5)
 */
export function isBreedingSeasonStart(day: number, hemisphere: Hemisphere): boolean {
  return dayOfYear(day) === BREEDING_SEASON[hemisphere].startDoy;
}
