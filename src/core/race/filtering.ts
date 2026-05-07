import type { Race } from "@/game/types";

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
 * Filter races by multiple criteria
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
      const tripleCrownKeys = new Set([
        "usa-tc",
        "canada-tc",
        "uk-classics",
      ]);
      const isTripleCrown = race.graded && tripleCrownKeys.has(race.graded.triplecrownKey || "");
      if (filters.tripleCrown && !isTripleCrown) return false;
      if (!filters.tripleCrown && isTripleCrown) return false;
    }

    // Filter by special race keys (generic - for Triple Crown, Classics, etc.)
    if (
      filters.specialFilterMode &&
      filters.specialFilterMode !== "all" &&
      filters.specialRaceKeys
    ) {
      const isSpecial = race.graded && filters.specialRaceKeys.has(race.graded.key);
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
 * Separate races into upcoming and past
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
 * Sort races by day
 */
export function sortRacesByDay(races: Race[], ascending: boolean = true): Race[] {
  return [...races].sort((a, b) => (ascending ? a.day - b.day : b.day - a.day));
}
