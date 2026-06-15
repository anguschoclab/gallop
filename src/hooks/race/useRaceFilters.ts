import { useMemo } from "react";
import type { Race, Horse } from "@/game/types";
import { getCountry } from "@/data/gradedRaces";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { distanceBucket } from "@/core/horse/paceTendency";

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

  const filteredRaces = useMemo(() => {
    return races
      .filter((r: Race) => !r.resolved && r.day >= day)
      .filter((r: Race) => (Number.isFinite(windowDays) ? r.day - day <= windowDays : true))
      .filter((r: Race) => {
        if (grade !== "all") {
          if (grade === "Graded") return !!r.graded;
          if (grade === "Ungraded") return !r.graded;
          return r.graded?.grade === grade;
        }
        return true;
      })
      .filter((r: Race) =>
        country === "all" ? true : getCountry(r.graded?.track ?? "") === country,
      )
      .filter((r: Race) => (surface === "all" ? true : r.surface === surface))
      .filter((r: Race) => (track === "all" ? true : r.graded?.track === track))
      .filter((r: Race) => (trip === "all" ? true : distanceBucket(r.distance) === trip))
      .filter((r: Race) => {
        if (stableId) {
          return r.entries.some((e) => e.stableId === stableId);
        }
        if (owned === "all") return true;
        const hasOwned = r.entries.some((e) => e.owned);
        return owned === "owned" ? hasOwned : !hasOwned;
      })
      .filter((r: Race) => {
        if (openOnly !== "1") return true;
        return r.entries.length < (r.fieldSize ?? 14);
      })
      .filter((r: Race) => {
        if (eligibleOnly !== "1") return true;
        if (ownedHorses.length === 0) return false;
        return ownedHorses.some((h) => isHorseEligibleForRace(h, r, new Set(), day));
      })
      .filter((r: Race) => (q ? r.name.toLowerCase().includes(q.toLowerCase()) : true))
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
    eligibleOnly,
    openOnly,
    ownedHorses,
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
