/**
 * tracks.ts - Track data and schedule management
 *
 * This file provides track data including track specifications (sections, surfaces,
 * dimensions), track schedule configuration for realistic race day patterns, and
 * lookup utilities for track data.
 *
 * Dependencies: ./types (Race), ./uuid (generateUUID), ./trackSchedulesData (TRACK_SCHEDULES), ./data/tracks.json (TRACK_DATA)
 * Related files: raceSchedule.ts (uses track schedules), raceGeneration/raceGen.ts (uses track data)
 */

import type { Race } from "./types";
import { generateUUID } from "./uuid";
import { TRACK_SCHEDULES } from "./trackSchedulesData";

export type TrackSection = {
  type: "straight" | "turn";
  length: number; // meters
  radius?: number; // meters (for turns)
  gradient?: number; // % slope (uphill/downhill)
  banking?: number; // degrees
};

export type CourseSpecification = {
  surface: "Turf" | "Dirt" | "Synthetic";
  name?: string; // e.g. "Main Track", "Inner Turf"
  circumference: number;
  straightLength: number; // home straight length
  width?: number; // meters
  sections: TrackSection[];
};

export type Track = {
  id: string;
  name: string;
  country: string;
  courses: CourseSpecification[];
  elevation?: number; // altitude above sea level
  osmId?: string;
};

// Track schedule configuration for realistic race day patterns
export type TrackSchedule = {
  trackId: string;
  raceDays: number[]; // Day of week (0=Sunday, 6=Saturday)
  racesPerDay: [number, number]; // Min, max races per day
  meetStart?: number; // Day of year (1-365)
  meetEnd?: number; // Day of year (1-365)
  regionalSystem: "north_america" | "europe" | "australia" | "asia" | "south_america";
};

import TRACK_DATA from "./data/tracks.json";

// All tracks with their UUIDs
export const TRACKS: Track[] = TRACK_DATA as Track[];

// Lookup maps
export const TRACK_BY_NAME: Record<string, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.name, t]),
);

export const TRACK_BY_ID: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

// Helper functions
export function getTrackByName(name: string): Track | undefined {
  return TRACK_BY_NAME[name];
}

export function getTrackById(id: string): Track | undefined {
  return TRACK_BY_ID[id];
}

export function getCountryByTrackName(name: string): string {
  const track = getTrackByName(name);
  return track?.country || "Other";
}

/**
 * Returns the specific course specification for a track and surface.
 */
export function getCourseSpec(
  trackId: string,
  surface: "Turf" | "Dirt" | "Synthetic",
): CourseSpecification | undefined {
  const track = getTrackById(trackId);
  return track?.courses.find((c) => c.surface === surface);
}

/**
 * Helper to get the correct course specification for a given race.
 */
export function getCourseForRace(race: Race): CourseSpecification | undefined {
  const trackId = race.trackId || race.graded?.trackId;
  const surface = race.surface || race.graded?.surface;
  if (!trackId || !surface) return undefined;
  return getCourseSpec(trackId, surface);
}

export { TRACK_SCHEDULES };
