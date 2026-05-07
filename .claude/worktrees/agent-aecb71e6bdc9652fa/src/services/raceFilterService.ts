import type { Race } from "@/game/types";
import {
  filterRacesByCriteria,
  separateUpcomingAndPast,
  sortRacesByDay,
  type RaceFilters,
} from "@/core/race/filtering";
import { MONTH_NAMES_FULL } from "@/core/calendar/dateFormatting";

/**
 * Race filtering orchestration with dependency injection
 * Extracted from: races.tsx, all calendar files
 */

export interface RaceFilterServiceDependencies {
  races: Race[];
  currentDay: number;
}

/**
 * Get filtered and sorted races based on criteria
 */
export function getFilteredRaces(
  dependencies: RaceFilterServiceDependencies,
  filters: RaceFilters,
): { upcoming: Race[]; past: Race[] } {
  const { races, currentDay } = dependencies;

  const filtered = filterRacesByCriteria(races, filters, currentDay);
  const { upcoming, past } = separateUpcomingAndPast(filtered, currentDay);

  return {
    upcoming: sortRacesByDay(upcoming, true),
    past: sortRacesByDay(past, false),
  };
}

/**
 * Get races grouped by track
 */
export function getRacesByTrack(
  dependencies: RaceFilterServiceDependencies,
  filters: RaceFilters,
): Record<string, Race[]> {
  const { races, currentDay } = dependencies;
  const filtered = filterRacesByCriteria(races, filters, currentDay);

  const racesByTrack = filtered.reduce(
    (acc, race) => {
      const track = race.graded?.track || "Other";
      if (!acc[track]) {
        acc[track] = [];
      }
      acc[track].push(race);
      return acc;
    },
    {} as Record<string, Race[]>,
  );

  // Sort races within each track by day
  for (const track in racesByTrack) {
    racesByTrack[track] = sortRacesByDay(racesByTrack[track], true);
  }

  return racesByTrack;
}

/**
 * Get races grouped by month
 */
export function getRacesByMonth(
  dependencies: RaceFilterServiceDependencies,
  filters: RaceFilters,
): Record<string, Race[]> {
  const { races, currentDay } = dependencies;
  const filtered = filterRacesByCriteria(races, filters, currentDay);

  const racesByMonth = filtered.reduce(
    (acc, race) => {
      const month = Math.floor((race.day - 1) / 30) + 1;
      const monthName = MONTH_NAMES_FULL[month - 1] || "Unknown";
      if (!acc[monthName]) {
        acc[monthName] = [];
      }
      acc[monthName].push(race);
      return acc;
    },
    {} as Record<string, Race[]>,
  );

  // Sort races within each month by day
  for (const month in racesByMonth) {
    racesByMonth[month] = sortRacesByDay(racesByMonth[month], true);
  }

  return racesByMonth;
}
