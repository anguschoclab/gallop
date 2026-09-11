/**
 * dataPorts.ts - Optional override injection point for core data accessors.
 *
 * Per PR 4 of the megaplan, core reads static data tables (tracks, graded
 * races, pedigree) through accessor modules. For data that could vary at
 * runtime, this DataPorts interface allows the composition root to inject
 * alternative implementations. The static data remains the default.
 *
 * Usage:
 *   import { DataPorts } from "@/core/data/dataPorts";
 *   const ports: DataPorts = { trackLookup: customTrackLookup };
 *
 * Most callers should use the accessor modules directly; only the composition
 * root (pipeline entry) needs to wire ports.
 */

import type { Track, CourseSpecification } from "./tracksAccessor";
import type { GradedRace } from "./gradedRacesAccessor";
import type { PedigreeHorse, StallionResearchData } from "./pedigreeAccessor";

/** Optional override for track lookups. */
export interface TrackLookupPorts {
  byId: (id: string) => Track | undefined;
  byName: (name: string) => Track | undefined;
  courseForRace: (race: {
    trackId?: string;
    graded?: { trackId?: string };
    surface?: string;
  }) => CourseSpecification | undefined;
}

/** Optional override for graded race lookups. */
export interface GradedRaceLookupPorts {
  byKey: (key: string) => GradedRace | undefined;
  byDayOfYear: (day: number) => GradedRace[];
}

/** Optional override for pedigree lookups. */
export interface PedigreeLookupPorts {
  byName: (name: string) => PedigreeHorse | undefined;
  stallionResearch: (name: string) => StallionResearchData | undefined;
}

/** Aggregate data-access ports. All fields optional — defaults are used when omitted. */
export interface DataPorts {
  trackLookup?: TrackLookupPorts;
  gradedRaceLookup?: GradedRaceLookupPorts;
  pedigreeLookup?: PedigreeLookupPorts;
}

/** Empty data ports sentinel — callers can check `!ports` to use defaults. */
export const EMPTY_DATA_PORTS: DataPorts = {};
