/**
 * filtering.ts - Race filtering and sorting logic
 *
 * This file provides pure functions for filtering races by criteria,
 * separating upcoming from past races, and sorting by day.
 *
 * Dependencies: @/game/types (Race), @/game/gradedRaces (GRADED_RACES)
 * Related files: Used throughout UI components for race list filtering
 */

import type { Race } from "@/game/types";
import { GRADED_RACES_BY_TRIPLECROWN_KEY } from "@/data/gradedRaces";

/**
 * Pure race filtering logic
 * Extracted from: races.tsx (lines 235-246), all calendar files
 */

export interface RaceFilters {
  grade?: "G1" | "G2" | "G3";
  track?: string;
  surface?: "Turf" | "Dirt" | "Synthetic";
  tripleCrown?: boolean | "all";
  class?: Race["raceClass"];
  /** Optional set of special race keys for filtering (e.g., Triple Crown, Classics) */
  specialRaceKeys?: Set<string>;
  /** Special filter mode: "all", "only", "exclude" */
  specialFilterMode?: "all" | "only" | "exclude";
}

/**
 * Filter races by multiple criteria.
 *
 * Filters a list of races by grade, track, surface, Triple Crown status,
 * special race keys, and class.
 *
 * @param races - The races to filter
 * @param filters - Filter criteria
 * @param currentDay - Current game day
 * @returns Filtered race list
 *
 * @example
 * const filtered = filterRacesByCriteria(races, { grade: "G1" }, currentDay);
 */
export function filterRacesByCriteria(
  races: Race[],
  filters: RaceFilters,
  currentDay: number,
): Race[] {
  return races.filter((race) => {
    // Filter by grade
    if (filters.grade && race.graded?.grade !== filters.grade) {
      return false;
    }

    // Filter by track
    if (filters.track && race.graded?.track !== filters.track) {
      return false;
    }

    // Filter by surface
    if (filters.surface && race.graded?.surface !== filters.surface) {
      return false;
    }

    // Filter by triple crown
    if (filters.tripleCrown !== "all" && filters.tripleCrown !== undefined) {
      const isTripleCrown = Boolean(race.graded && GRADED_RACES_BY_TRIPLECROWN_KEY.has(race.graded.triplecrownKey || ""));
      if (filters.tripleCrown && !isTripleCrown) return false;
      if (!filters.tripleCrown && isTripleCrown) return false;
    }

    // Filter by special race keys (generic - for Triple Crown, Classics, etc.)
    if (
      filters.specialFilterMode &&
      filters.specialFilterMode !== "all" &&
      filters.specialRaceKeys
    ) {
      const isSpecial = Boolean(race.graded && filters.specialRaceKeys.has(race.graded.key));
      if (filters.specialFilterMode === "only" && !isSpecial) return false;
      if (filters.specialFilterMode === "exclude" && isSpecial) return false;
    }

    // Filter by class
    if (filters.class && race.raceClass !== filters.class) {
      return false;
    }

    return true;
  });
}

/**
 * Separate races into upcoming and past.
 *
 * Splits a race list into two arrays based on the current day.
 *
 * @param races - The races to separate
 * @param currentDay - Current game day
 * @returns Object with upcoming and past race arrays
 *
 * @example
 * const { upcoming, past } = separateUpcomingAndPast(races, currentDay);
 */
export function separateUpcomingAndPast(
  races: Race[],
  currentDay: number,
): { upcoming: Race[]; past: Race[] } {
  const upcoming = races.filter((race) => race.day >= currentDay);
  const past = races.filter((race) => race.day < currentDay);
  return { upcoming, past };
}

/**
 * Sort races by day.
 *
 * Returns a new array sorted by race day in ascending or descending order.
 *
 * @param races - The races to sort
 * @param ascending - Sort direction (true = ascending, false = descending)
 * @returns Sorted race array
 *
 * @example
 * const sorted = sortRacesByDay(races, true);
 */
export function sortRacesByDay(races: Race[], ascending: boolean = true): Race[] {
  return [...races].sort((a, b) => (ascending ? a.day - b.day : b.day - a.day));
}
