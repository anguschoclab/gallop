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
import type { Track, TrackSchedule } from "./tracks";
import { createRng, hashStr } from "@/game/rng";
import { getTrackById } from "./tracks";
import { generateRace, makeGradedRace } from "./raceGeneration/raceGen";
import { GRADED_RACES } from "@/core/data/gradedRaces";
import { generateNorthAmericanRaceCard } from "./raceGeneration/northAmerica";

// Breeders' Cup rotation pool
const BREEDERS_CUP_TRACKS = [
  { trackId: "a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", name: "Keeneland" },
  { trackId: "b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d", name: "Del Mar" },
  { trackId: "f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", name: "Santa Anita" },
  { trackId: "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", name: "Churchill Downs" },
];

// Helper: Get Breeders' Cup track for a given year
function getBreedersCupTrack(year: number): { trackId: string; name: string } {
  const index = (year - 1) % 4;
  return BREEDERS_CUP_TRACKS[index];
}

import { DAYS_PER_YEAR } from "@/game/constants/gameConstants";
import { dayOfYear } from "@/core/calendar/dateFormatting";

// Helper: Get current year from game day
/**
 * Returns the 1-based game year counter (Day 1-365 = Year 1).
 * Distinct from calendar year (2026-based).
 */
export function getCurrentYear(gameDay: number): number {
  // Day 1 = Year 1, Day 366 = Year 2, etc.
  return Math.floor((gameDay - 1) / DAYS_PER_YEAR) + 1;
}

// Helper: Get day of week (0=Sunday, 6=Saturday) from game day
export function getDayOfWeek(gameDay: number): number {
  return (gameDay - 1) % 7;
}

// Helper: Check if a track is racing on a given day
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

// Generate races for a specific track on a specific day
// Uses regional-specific generators for authentic race patterns
export function generateTrackRaces(
  track: Track,
  schedule: TrackSchedule,
  gameDay: number,
  existingRaces: Race[],
  rng: Rng,
): Race[] {
  const numRaces = rng.int(schedule.racesPerDay[0], schedule.racesPerDay[1]);

  // Use regional-specific generator based on track's regional system
  if (schedule.regionalSystem === "north_america") {
    return generateNorthAmericanRaceCard(track, gameDay, numRaces, rng);
  }

  // Fallback to generic generator for other regions (will be expanded in future sprints)
  const races: Race[] = [];
  const trackSurfaces = track.courses.map((c) => c.surface) as ("Turf" | "Dirt" | "Synthetic")[];
  const availableSurfaces = trackSurfaces.length > 0 ? trackSurfaces : ["Dirt" as const];
  for (let i = 0; i < numRaces; i++) {
    const race = generateRace(gameDay, rng);
    race.trackId = track.id;
    race.surface = rng.pick(availableSurfaces);
    races.push(race);
  }

  return races;
}

// Main function: Generate all track races for a given day
export function generateTrackSchedule(
  gameDay: number,
  existingRaces: Race[],
  schedules: TrackSchedule[],
  rng: Rng,
): Race[] {
  const races = [...existingRaces];
  const doy = dayOfYear(gameDay);

  // Add graded stakes whose dayOfYear falls on this day
  for (const g of GRADED_RACES) {
    if (g.dayOfYear !== doy) continue;
    if (races.some((r) => r.graded?.key === g.key && r.day === gameDay)) continue;
    races.push(makeGradedRace(g, gameDay, rng));
  }

  // Generate track-specific races
  for (const schedule of schedules) {
    const track = getTrackById(schedule.trackId);
    if (!track) continue;

    if (isTrackRacing(schedule, gameDay)) {
      const trackRaces = generateTrackRaces(track, schedule, gameDay, races, rng);
      races.push(...trackRaces);
    }
  }

  return races;
}

// Generate all graded races for a given game year (called on year transition)
// Uses dayOfYearVariance to apply deterministic jitter to each race's schedule date
export function generateAnnualCalendar(year: number, existingRaces: Race[]): Race[] {
  const yearRng = createRng(hashStr(`annual_calendar_${year}`));
  const firstDayOfYear = (year - 1) * 365 + 1;
  const races = [...existingRaces];

  // Get Breeders' Cup track for this year
  const bcTrack = getBreedersCupTrack(year);

  for (const g of GRADED_RACES) {
    const variance = g.dayOfYearVariance ?? 3;
    let jitter = 0;
    if (variance > 0) {
      jitter = yearRng.int(-variance, variance);
    }
    const rawDoy = g.dayOfYear + jitter;
    const clampedDoy = Math.max(1, Math.min(365, rawDoy));
    const gameDay = firstDayOfYear + clampedDoy - 1;

    if (
      races.some(
        (r) => r.graded?.key === g.key && r.day >= firstDayOfYear && r.day < firstDayOfYear + DAYS_PER_YEAR,
      )
    ) {
      continue;
    }

    const raceRng = createRng(hashStr(`graded_${g.key}_${year}`));
    const race = makeGradedRace(g, gameDay, raceRng);

    // Override Breeders' Cup track with year-appropriate track
    if (g.bcKey === "breeders-cup" && race.graded) {
      race.graded.trackId = bcTrack.trackId;
      race.graded.track = bcTrack.name;
    }

    races.push(race);
  }

  return races;
}

// Generate upcoming races for the next 7 days
// Each day uses a derived seed for determinism
export function generateUpcomingRaces(
  currentRaces: Race[],
  newDay: number,
  schedules: TrackSchedule[],
  baseRng: Rng, // Used if we need global randomness, but we prefer daily seeds
): Race[] {
  const races = [...currentRaces];
  // We don't actually need baseRng if we derive daily seeds,
  // but we'll keep it for interface consistency if needed.

  // Generate races for the next 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const futureDay = newDay + offset;
    // Derive a unique seed for this specific day
    const dailyRng = createRng(hashStr(`raceGen_${futureDay}`));

    const dayRaces = generateTrackSchedule(futureDay, races, schedules, dailyRng);

    // Add only new races (avoid duplicates)
    for (const race of dayRaces) {
      if (!races.some((r) => r.id === race.id)) {
        races.push(race);
      }
    }
  }

  return races;
}
