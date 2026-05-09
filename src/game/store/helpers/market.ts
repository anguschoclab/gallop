/**
 * store/helpers/market.ts - Market and day advancement helpers
 *
 * This file provides pure business logic for market refresh, horse aging based on
 * hemisphere-specific universal birthdays, and race scheduling.
 *
 * Dependencies: @/game/types (Horse, Race), @/game/horseGen (generateHorse), @/game/raceSchedule (generateUpcomingRaces), @/game/tracks (TRACK_SCHEDULES), @/core/calendar/breedingCalendar (isUniversalBirthday), @/game/rng (Rng)
 * Related files: store/slices/coreSlice.ts (uses market helpers), store/slices/racingSlice.ts (uses race scheduling)
 */

/**
 * Market and Day Advancement Helper Functions
 * Pure business logic for market refresh and race scheduling
 */

import type { Horse, Race } from "@/game/types";
import { generateHorse } from "@/game/horseGen";
import { generateUpcomingRaces as generateScheduledRaces } from "@/game/raceSchedule";
import { TRACK_SCHEDULES } from "@/game/tracks";
import { isUniversalBirthday } from "@/core/calendar/breedingCalendar";
import type { Rng } from "@/game/rng";

/**
 * Ages horses based on hemisphere-specific universal birthdays
 * Northern horses age on Jan 1 (day-of-year 1), Southern on Aug 1 (DoY 213)
 * @param horses - Array of horses to age
 * @param newDay - Current simulation day
 * @returns Array of horses with updated ages and genders where applicable
 */
export function ageHorses(horses: Horse[], newDay: number): Horse[] {
  const northernTick = isUniversalBirthday(newDay, "Northern");
  const southernTick = isUniversalBirthday(newDay, "Southern");
  if (!northernTick && !southernTick) return horses;
  return horses.map((h) => {
    const ticks =
      (h.hemisphere === "Northern" && northernTick) ||
      (h.hemisphere === "Southern" && southernTick);
    if (!ticks) return h;
    const newAge = h.age + 1;
    const newGender =
      newAge >= 3
        ? h.gender === "colt"
          ? "horse"
          : h.gender === "filly"
            ? "mare"
            : h.gender
        : h.gender;
    return { ...h, age: newAge, gender: newGender };
  });
}

/**
 * Refreshes the horse market by replacing old horses with new ones
 * Keeps 2 oldest horses, generates new ones to maintain 5 total
 * @param currentMarket - Current market horses
 * @param rng - Random number generator
 * @returns Updated market array
 */
export function refreshMarket(currentMarket: Horse[], rng: Rng): Horse[] {
  let market = [...currentMarket];
  if (market.length > 3) market = market.slice(2);
  while (market.length < 5) {
    const r = rng.next();
    const tier = r < 0.5 ? "budget" : r < 0.85 ? "mid" : "elite";
    market.push(generateHorse({ tier: tier as never }, rng));
  }
  return market;
}

/**
 * Generates upcoming races using the track-based schedule system
 * @param currentRaces - Current races in the schedule
 * @param newDay - Current simulation day
 * @param rng - Random number generator
 * @returns Updated races array with new upcoming races
 */
export function generateUpcomingRaces(currentRaces: Race[], newDay: number, rng: Rng): Race[] {
  return generateScheduledRaces(currentRaces, newDay, TRACK_SCHEDULES, rng);
}

/**
 * Removes old resolved races from the schedule
 * Keeps graded races indefinitely, ungraded resolved races for 30 days
 * @param races - Current races array
 * @param newDay - Current simulation day
 * @returns Filtered races array
 */
export function pruneOldRaces(races: Race[], newDay: number): Race[] {
  return races.filter((r) => {
    if (!r.resolved) return true;
    if (r.graded) return r.day > newDay - 365;
    return r.day > newDay - 3;
  });
}

