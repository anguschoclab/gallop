/**
 * tracksAccessor.ts - Single import surface for track data in core.
 *
 * Consolidates the 24 scattered `@/data/tracks` imports from src/core into one
 * accessor module. Per PR 4 of the megaplan, this is a consolidation step:
 * core still reads the static track tables, but through one module so the
 * dependency surface is explicit and replaceable in tests.
 *
 * For runtime-varying data (track schedules, graded race lists), a DataPorts
 * interface can override the defaults at the composition root. The static data
 * remains the default implementation.
 *
 * Dependencies: @/data/tracks (Track, CourseSpecification, TrackSchedule, lookups)
 * Related files: src/core/data/dataPorts.ts (optional override injection)
 */

import {
  TRACKS,
  TRACK_BY_NAME,
  TRACK_BY_ID,
  TRACK_SCHEDULES,
  getTrackByName,
  getTrackById,
  getCountryByTrackName,
  getCourseSpec,
  getCourseForRace,
} from "@/data/tracks";
import type { Track, CourseSpecification, TrackSchedule, TrackSection } from "@/data/tracks";

export type { Track, CourseSpecification, TrackSchedule, TrackSection };

/** Override registry — tests can replace any accessor by mutating this object. */
export const trackAccessors = {
  allTracks: (): Track[] => TRACKS,
  trackByName: (name: string): Track | undefined => getTrackByName(name),
  trackById: (id: string): Track | undefined => getTrackById(id),
  countryByTrackName: (name: string): string => getCountryByTrackName(name),
  courseSpec: (trackId: string, surface: "Turf" | "Dirt" | "Synthetic") =>
    getCourseSpec(trackId, surface),
  courseForRace: (race: { trackId?: string; graded?: { trackId?: string }; surface?: string }) =>
    getCourseForRace(race as never),
  schedules: (): typeof TRACK_SCHEDULES => TRACK_SCHEDULES,
  trackByMap: TRACK_BY_NAME,
  trackByIdMap: TRACK_BY_ID,
};

/** Convenience re-exports for type-only imports and existing call sites. */
export {
  TRACKS,
  TRACK_BY_NAME,
  TRACK_BY_ID,
  TRACK_SCHEDULES,
  getTrackByName,
  getTrackById,
  getCountryByTrackName,
  getCourseSpec,
  getCourseForRace,
};
