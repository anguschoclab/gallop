import { useMemo } from "react";
import type { Race } from "@/game/types";
import { getCountry } from "@/data/gradedRaces";

/**
 * Filter state for races.
 */
export type RaceFilters = {
  grade: string;
  country: string;
  surface: string;
  track: string;
  owned: string;
  q: string;
  stableId?: string;
};

/**
 * Hook to manage race filtering logic and derive available filter options.
 *
 * @param races The complete list of races.
 * @param day The current game day.
 * @param filters The current filter values.
 * @returns An object containing the filtered races and available filter options (countries, tracks).
 */
export function useRaceFilters(races: Race[], day: number, filters: RaceFilters) {
  const { grade, country, surface, track, owned, q, stableId } = filters;

  const filteredRaces = useMemo(() => {
    return races
      .filter((r: Race) => !r.resolved && r.day >= day)
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
      .filter((r: Race) => {
        if (stableId) {
          return r.entries.some((e) => e.stableId === stableId);
        }
        if (owned === "all") return true;
        const hasOwned = r.entries.some((e) => e.owned);
        return owned === "owned" ? hasOwned : !hasOwned;
      })
      .filter((r: Race) => (q ? r.name.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a: Race, b: Race) => a.day - b.day);
  }, [races, day, grade, country, surface, track, owned, q, stableId]);

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
