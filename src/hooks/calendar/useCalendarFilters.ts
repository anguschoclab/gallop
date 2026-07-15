import { useMemo, useCallback } from "react";
import { useGame } from "@/game/store";
import type { Grade } from "@/data/gradedRaces";
import { getRegion } from "@/core/calendar/regions";

export interface CalendarSearch {
  grade?: Grade | "all";
  special?: "all" | "only" | "exclude";
  view?: "month" | "track";
}

export function useCalendarFilters(regionId: string, search: CalendarSearch) {
  const { grade, special } = search;
  const region = getRegion(regionId)!;

  const races = useGame((s) => s.races);
  const currentDay = useGame((s) => s.day);

  const regionTracksSet = useMemo(() => new Set(region.tracks), [region.tracks]);

  // ⚡ Bolt: Replace O(N*M) lookup with O(N+M) Set check
  const regionRaces = useMemo(
    () =>
      Object.values(races).filter((race) => race.graded && regionTracksSet.has(race.graded.track)),
    [races, regionTracksSet],
  );

  const filteredRaces = useMemo(
    () =>
      regionRaces.filter((race) => {
        if (grade !== "all" && race.graded?.grade !== grade) return false;
        if (special !== "all" && region.specialRaceKeys) {
          const isSpecial = region.specialRaceKeys.has(race.graded?.key ?? "");
          if (special === "only" && !isSpecial) return false;
          if (special === "exclude" && isSpecial) return false;
        }
        return true;
      }),
    [regionRaces, grade, special, region.specialRaceKeys],
  );

  return {
    region,
    currentDay,
    regionRaces,
    filteredRaces,
  };
}
