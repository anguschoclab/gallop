/**
 * gradedRacesAccessor.ts - Single import surface for graded race data in core.
 *
 * Consolidates the 17 scattered `@/data/gradedRaces` imports from src/core into
 * one accessor module. Per PR 4 of the megaplan, this is a consolidation step.
 *
 * Dependencies: @/data/gradedRaces (GradedRace, lookup maps)
 * Related files: src/core/data/dataPorts.ts (optional override injection)
 */

import {
  GRADED_RACES,
  GRADED_RACES_BY_KEY,
  GRADED_RACES_BY_DAY_OF_YEAR,
  GRADED_RACES_BY_TRIPLECROWN_KEY,
  GRADED_RACES_BY_BC_KEY,
  getRaceCountry,
  getTrackContinent,
  getDefaultFieldSize,
} from "@/data/gradedRaces";
import type { GradedRace, Grade, Continent } from "@/data/gradedRaces";

export type { GradedRace, Grade, Continent };

/** Override registry — tests can replace any accessor by mutating this object. */
export const gradedRaceAccessors = {
  all: (): GradedRace[] => GRADED_RACES,
  byKey: (key: string): GradedRace | undefined => GRADED_RACES_BY_KEY.get(key),
  byDayOfYear: (day: number): GradedRace[] => GRADED_RACES_BY_DAY_OF_YEAR.get(day) ?? [],
  byTripleCrownKey: (key: string): GradedRace[] => GRADED_RACES_BY_TRIPLECROWN_KEY.get(key) ?? [],
  country: (race: GradedRace): string => getRaceCountry(race),
  trackContinent: (track: string): Continent => getTrackContinent(track),
  defaultFieldSize: (grade: Grade, country: string): number => getDefaultFieldSize(grade, country),
};

/** Convenience re-exports for type-only imports and existing call sites. */
export {
  GRADED_RACES,
  GRADED_RACES_BY_KEY,
  GRADED_RACES_BY_DAY_OF_YEAR,
  GRADED_RACES_BY_TRIPLECROWN_KEY,
  GRADED_RACES_BY_BC_KEY,
  getRaceCountry,
  getTrackContinent,
  getDefaultFieldSize,
};
