/**
 * raceSchedule.ts - Race schedule generator
 *
 * This file generates realistic race cards based on track schedules using regional-
 * specific generators for authentic race patterns, including Breeders' Cup rotation.
 *
 * Dependencies: ./types (Race), ./tracks (Track, TrackSchedule), ./rng (createRng, hashStr), ./tracks (getTrackById), ./raceGeneration/raceGen (generateRace, makeGradedRace), @/core/data/gradedRaces (GRADED_RACES), ./raceGeneration/northAmerica (generateNorthAmericanRaceCard), ./constants/gameConstants (DAYS_PER_YEAR), @/core/calendar/dateFormatting (dayOfYear)
 * Related files: raceGeneration/northAmerica.ts (NA-specific generator), raceGeneration/raceGen.ts (base generator)
 */

// Race Schedule Generator - Generates realistic race cards based on track schedules
// This uses regional-specific generators for authentic race patterns

import type { Race } from "./types";
import type { Track, TrackSchedule } from "@/data/tracks";
import type { Rng } from "@/core/common/types";
import { createRng, hashStr } from "@/core/common/rng";
import { getTrackById } from "@/data/tracks";
import { generateRace, makeGradedRace } from "./generation/raceGen";
import { GRADED_RACES, GRADED_RACES_BY_DAY_OF_YEAR } from "@/data/gradedRaces";
import { generateNorthAmericanRaceCard } from "./generation/northAmerica";
import { generateEuropeanRaceCard } from "./generation/europe";
import { generateAustralianRaceCard } from "./generation/australia";
import { generateAsianRaceCard } from "./generation/asia";
import { generateSouthAmericanRaceCard } from "./generation/southAmerica";

// Breeders' Cup rotation pool
const BREEDERS_CUP_TRACKS = [
  { trackId: "a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", name: "Keeneland" },
  { trackId: "b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d", name: "Del Mar" },
  { trackId: "f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", name: "Santa Anita" },
  { trackId: "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", name: "Churchill Downs" },
];

/**
 * Get Breeders' Cup track for a given year
 * @param year - Game year
 * @returns Track ID and name for the Breeders' Cup host track
 */
function getBreedersCupTrack(year: number): { trackId: string; name: string } {
  const index = (year - 1) % 4;
  return BREEDERS_CUP_TRACKS[index];
}

import { DAYS_PER_YEAR } from "@/constants";
import { dayOfYear } from "@/core/calendar/dateFormatting";

/**
 * Returns the 1-based game year counter (Day 1-365 = Year 1).
 *
 * Distinct from calendar year (2026-based).
 *
 * @param gameDay - Current game day
 * @returns Game year number
 */
export function getCurrentYear(gameDay: number): number {
  // Day 1 = Year 1, Day 366 = Year 2, etc.
  return Math.floor((gameDay - 1) / DAYS_PER_YEAR) + 1;
}

/**
 * Get day of week from game day.
 *
 * @param gameDay - Current game day
 * @returns Day of week (0=Sunday, 6=Saturday)
 */
export function getDayOfWeek(gameDay: number): number {
  return (gameDay - 1) % 7;
}

/**
 * Check if a track is racing on a given day.
 *
 * Checks if the track's schedule includes this day of week and if within meet dates.
 *
 * @param schedule - Track schedule
 * @param gameDay - Current game day
 * @returns True if track is racing on this day
 */
export function isTrackRacing(schedule: TrackSchedule, gameDay: number): boolean {
  const dayOfWeek = getDayOfWeek(gameDay);
  const doy = dayOfYear(gameDay);

  // Check if this is a race day for the track
  if (!schedule.raceDays.includes(dayOfWeek)) {
    return false;
  }

  // Check if within meet dates
  const { meetStart, meetEnd } = schedule;
  if (meetStart && meetEnd) {
    if (meetStart <= meetEnd) {
      // Normal case: meet within same year
      if (doy < meetStart || doy > meetEnd) return false;
    } else {
      // Cross-year meet (e.g., meetStart=300, meetEnd=90)
      if (doy < meetStart && doy > meetEnd) return false;
    }
  } else if (meetStart && doy < meetStart) {
    return false;
  } else if (meetEnd && doy > meetEnd) {
    return false;
  }

  return true;
}

/**
 * Generate races for a specific track on a specific day.
 *
 * Uses regional-specific generators for authentic race patterns.
 *
 * @param track - Track to generate races for
 * @param schedule - Track schedule
 * @param gameDay - Current game day
 * @param rng - Random number generator
 * @returns Array of generated races
 */
export function generateTrackRaces(
  track: Track,
  schedule: TrackSchedule,
  gameDay: number,
  rng: Rng,
): Race[] {
  const numRaces = rng.int(schedule.racesPerDay[0], schedule.racesPerDay[1]);

  // Use regional-specific generator based on track's regional system
  switch (schedule.regionalSystem) {
    case "north_america":
      return generateNorthAmericanRaceCard(track, gameDay, numRaces, rng);
    case "europe":
      return generateEuropeanRaceCard(track, gameDay, numRaces, rng);
    case "australia":
      return generateAustralianRaceCard(track, gameDay, numRaces, rng);
    case "asia":
    case "japan":
      return generateAsianRaceCard(track, gameDay, numRaces, rng);
    case "south_america":
      return generateSouthAmericanRaceCard(track, gameDay, numRaces, rng);
    default: {
      // Fallback to generic generator if regional system is unknown
      const races: Race[] = [];
      const trackSurfaces = track.courses.map((c) => c.surface) as (
        | "Turf"
        | "Dirt"
        | "Synthetic"
      )[];
      const availableSurfaces = trackSurfaces.length > 0 ? trackSurfaces : ["Dirt" as const];
      for (let i = 0; i < numRaces; i++) {
        const race = generateRace(gameDay, rng);
        race.trackId = track.id;
        race.surface = rng.pick(availableSurfaces);
        races.push(race);
      }
      return races;
    }
  }
}

/**
 * Generate all track races for a given day.
 *
 * Generates graded stakes and track-specific races based on schedules.
 *
 * @param gameDay - Current game day
 * @param existingRaces - Existing races
 * @param schedules - Array of track schedules
 * @param rng - Random number generator
 * @returns Array of all races for the day
 */
export function generateTrackSchedule(
  gameDay: number,
  existingRaces: Race[],
  schedules: TrackSchedule[],
  rng: Rng,
): Race[] {
  const doy = dayOfYear(gameDay);
  const dow = getDayOfWeek(gameDay);
  const newRaces: Race[] = [];

  // Indexed graded race lookup — O(1) instead of scanning 904 races
  const gradedKeySet = new Set(
    existingRaces.filter((r) => r.graded).map((r) => `${r.graded!.key}_${r.day}`),
  );
  for (const g of GRADED_RACES_BY_DAY_OF_YEAR.get(doy) ?? []) {
    if (gradedKeySet.has(`${g.key}_${gameDay}`)) continue;
    newRaces.push(makeGradedRace(g, gameDay, rng));
  }

  // Pre-filter schedules by day-of-week before meet date check
  for (const schedule of schedules) {
    if (!schedule.raceDays.includes(dow)) continue;
    const track = getTrackById(schedule.trackId);
    if (!track) continue;
    if (isTrackRacing(schedule, gameDay)) {
      newRaces.push(...generateTrackRaces(track, schedule, gameDay, rng));
    }
  }

  return [...existingRaces, ...newRaces];
}

/**
 * Generate all graded races for a given game year.
 *
 * Called on year transition. Uses dayOfYearVariance to apply deterministic
 * jitter to each race's schedule date. Handles Breeders' Cup track rotation.
 *
 * @param year - Game year
 * @param existingRaces - Existing races
 * @returns Array of graded races for the year
 */
export function generateAnnualCalendar(year: number, existingRaces: Race[]): Race[] {
  const yearRng = createRng(hashStr(`annual_calendar_${year}`));
  const firstDayOfYear = (year - 1) * 365 + 1;
  const races = [...existingRaces];

  // Get Breeders' Cup track for this year
  const bcTrack = getBreedersCupTrack(year);

  // Pre-build dedup set for O(1) lookup
  const existingKeys = new Set(
    existingRaces
      .filter((r) => r.graded)
      .map((r) => `${r.graded!.key}_${r.day}`),
  );

  for (const g of GRADED_RACES) {
    const variance = g.dayOfYearVariance ?? 3;
    let jitter = 0;
    if (variance > 0) {
      jitter = yearRng.int(-variance, variance);
    }
    const rawDoy = g.dayOfYear + jitter;
    const clampedDoy = Math.max(1, Math.min(365, rawDoy));
    const gameDay = firstDayOfYear + clampedDoy - 1;

    if (existingKeys.has(`${g.key}_${gameDay}`)) continue;

    const raceRng = createRng(hashStr(`graded_${g.key}_${year}`));
    const race = makeGradedRace(g, gameDay, raceRng);

    // Override Breeders' Cup track with year-appropriate track
    if (g.bcKey === "breeders-cup" && race.graded) {
      race.graded.trackId = bcTrack.trackId;
      race.graded.track = bcTrack.name;
    }

    races.push(race);
    existingKeys.add(`${g.key}_${gameDay}`);
  }

  return races;
}

/**
 * Generate upcoming races for the next 7 days.
 *
 * Each day uses a derived seed for determinism. Adds only new races
 * to avoid duplicates.
 *
 * @param currentRaces - Current races
 * @param newDay - Starting day for generation
 * @param schedules - Array of track schedules
 * @returns Array of upcoming races
 */
export function generateUpcomingRaces(
  currentRaces: Race[],
  newDay: number,
  schedules: TrackSchedule[],
): Race[] {
  const races = [...currentRaces];
  const raceIdSet = new Set(races.map((r) => r.id));
  const gradedKeySet = new Set(
    races.filter((r) => r.graded).map((r) => `${r.graded!.key}_${r.day}`),
  );

  // Build day-of-week index once for all 7 future days
  const schedulesByDow = new Map<number, TrackSchedule[]>();
  for (const s of schedules) {
    for (const dow of s.raceDays) {
      const arr = schedulesByDow.get(dow);
      if (arr) arr.push(s);
      else schedulesByDow.set(dow, [s]);
    }
  }

  for (let offset = 1; offset <= 7; offset++) {
    const futureDay = newDay + offset;
    const dailyRng = createRng(hashStr(`raceGen_${futureDay}`));
    const doy = dayOfYear(futureDay);
    const dow = getDayOfWeek(futureDay);

    // Graded races via index
    for (const g of GRADED_RACES_BY_DAY_OF_YEAR.get(doy) ?? []) {
      const dedupKey = `${g.key}_${futureDay}`;
      if (gradedKeySet.has(dedupKey)) continue;
      const race = makeGradedRace(g, futureDay, dailyRng);
      races.push(race);
      raceIdSet.add(race.id);
      gradedKeySet.add(dedupKey);
    }

    // Track races via pre-filtered schedules
    for (const schedule of schedulesByDow.get(dow) ?? []) {
      const track = getTrackById(schedule.trackId);
      if (!track) continue;
      if (isTrackRacing(schedule, futureDay)) {
        const trackRaces = generateTrackRaces(track, schedule, futureDay, dailyRng);
        for (const race of trackRaces) {
          if (!raceIdSet.has(race.id)) {
            raceIdSet.add(race.id);
            races.push(race);
          }
        }
      }
    }
  }

  return races;
}
