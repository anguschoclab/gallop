import { useMemo } from "react";
import type { Race, Horse } from "@/game/types";
import { getCountry } from "@/data/gradedRaces";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { classifyDistanceBucket } from "@/core/horse/paceTendency";
import { DEFAULT_FIELD_SIZE } from "@/constants";

/**
 * Filter state for races. The optional fields power the quick-filter chips
 * (time window, trip bucket, surface, eligibility, open field) without breaking
 * existing callers that still pass only the legacy fields.
 */
export type RaceFilters = {
  grade: string;
  country: string;
  surface: string;
  track: string;
  owned: string;
  q: string;
  stableId?: string;
  /** Days ahead from `day` to include. "all" or a numeric string. */
  window?: string;
  /** Trip bucket: "all" | "sprint" | "mile" | "route". */
  trip?: string;
  /** "1" to only show races at least one owned horse is eligible for. */
  eligibleOnly?: string;
  /** "1" to only show races whose field is not yet full. */
  openOnly?: string;
};

/**
 * Hook to manage race filtering logic and derive available filter options.
 *
 * @param races The complete list of races.
 * @param day The current game day.
 * @param filters The current filter values.
 * @param horses Optional roster used for the "eligible" quick filter.
 * @returns Filtered races and the available filter options.
 */
export function useRaceFilters(
  races: Race[],
  day: number,
  filters: RaceFilters,
  horses: Horse[] = [],
) {
  const {
    grade,
    country,
    surface,
    track,
    owned,
    q,
    stableId,
    window: timeWindow = "all",
    trip = "all",
    eligibleOnly,
    openOnly,
  } = filters;

  const ownedHorses = useMemo(() => horses.filter((h) => h.owned), [horses]);
  const windowDays = timeWindow === "all" ? Infinity : Number(timeWindow);
  const emptySet = useMemo(() => new Set<string>(), []);

  const eligibleRaceIds = useMemo(() => {
    if (eligibleOnly !== "1") return null;
    const ids = new Set<string>();
    if (ownedHorses.length === 0) return ids;
    for (const r of races) {
      if (r.resolved || r.day < day) continue;
      if (ownedHorses.some((h) => isHorseEligibleForRace(h, r, emptySet, day))) {
        ids.add(r.id);
      }
    }
    return ids;
  }, [races, day, ownedHorses, eligibleOnly, emptySet]);

  const filteredRaces = useMemo(() => {
    const qLower = q ? q.toLowerCase() : "";
    return races
      .filter((r: Race) => {
        if (r.resolved || r.day < day) return false;
        if (Number.isFinite(windowDays) && r.day - day > windowDays) return false;
        if (grade !== "all") {
          if (grade === "Graded" && !r.graded) return false;
          if (grade === "Ungraded" && r.graded) return false;
          if (grade !== "Graded" && grade !== "Ungraded" && r.graded?.grade !== grade) return false;
        }
        if (country !== "all" && getCountry(r.graded?.track ?? "") !== country) return false;
        if (surface !== "all" && r.surface !== surface) return false;
        if (track !== "all" && r.graded?.track !== track) return false;
        if (trip !== "all" && classifyDistanceBucket(r.distance) !== trip) return false;
        if (stableId) {
          if (!r.entries.some((e) => e.stableId === stableId)) return false;
        } else if (owned !== "all") {
          const hasOwned = r.entries.some((e) => e.owned);
          if (owned === "owned" && !hasOwned) return false;
          if (owned === "not-owned" && hasOwned) return false;
        }
        if (openOnly === "1" && r.entries.length >= (r.fieldSize ?? DEFAULT_FIELD_SIZE))
          return false;
        if (eligibleRaceIds && !eligibleRaceIds.has(r.id)) return false;
        if (qLower && !r.name.toLowerCase().includes(qLower)) return false;
        return true;
      })
      .sort((a: Race, b: Race) => a.day - b.day);
  }, [
    races,
    day,
    grade,
    country,
    surface,
    track,
    owned,
    q,
    stableId,
    windowDays,
    trip,
    openOnly,
    eligibleRaceIds,
  ]);

  const filterOptions = useMemo(() => {
    const gradedRaces = races.filter((r: Race) => r.graded);
    const uniqueCountries = Array.from(
      new Set(gradedRaces.map((r: Race) => getCountry(r.graded!.track))),
    )
      .filter(Boolean)
      .sort() as string[];

    const uniqueTracks = Array.from(new Set(gradedRaces.map((r: Race) => r.graded!.track))).sort();

    return { countries: uniqueCountries, tracks: uniqueTracks };
  }, [races]);

  return {
    filteredRaces,
    countries: filterOptions.countries,
    tracks: filterOptions.tracks,
  };
}
