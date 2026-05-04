// Race Schedule Generator - Generates realistic race cards based on track schedules
// This uses regional-specific generators for authentic race patterns

import type { Race } from "./types";
import type { Track, TrackSchedule } from "./tracks";
import { getTrackById } from "./tracks";
import { generateRace } from "./horseGen";
import { makeGradedRace } from "./horseGen";
import { GRADED_RACES } from "./gradedRaces";
import { generateNorthAmericanRaceCard } from "./raceGeneration/northAmerica";

// Helper: Get current year from game day
export function getCurrentYear(gameDay: number): number {
  // Day 1 = Year 1, Day 366 = Year 2, etc.
  return Math.floor((gameDay - 1) / 365) + 1;
}

// Helper: Get day of year (1-365) from game day
export function getDayOfYear(gameDay: number): number {
  return ((gameDay - 1) % 365) + 1;
}

// Helper: Get day of week (0=Sunday, 6=Saturday) from game day
export function getDayOfWeek(gameDay: number): number {
  return (gameDay - 1) % 7;
}

// Helper: Check if a track is racing on a given day
export function isTrackRacing(schedule: TrackSchedule, gameDay: number): boolean {
  const dayOfWeek = getDayOfWeek(gameDay);
  const dayOfYear = getDayOfYear(gameDay);

  // Check if this is a race day for the track
  if (!schedule.raceDays.includes(dayOfWeek)) {
    return false;
  }

  // Check if within meet dates
  if (schedule.meetStart && dayOfYear < schedule.meetStart) {
    return false;
  }
  if (schedule.meetEnd && dayOfYear > schedule.meetEnd) {
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
  existingRaces: Race[]
): Race[] {
  const numRaces = Math.floor(
    Math.random() * (schedule.racesPerDay[1] - schedule.racesPerDay[0] + 1)
  ) + schedule.racesPerDay[0];

  // Use regional-specific generator based on track's regional system
  if (schedule.regionalSystem === "north_america") {
    return generateNorthAmericanRaceCard(track, gameDay, numRaces);
  }

  // Fallback to generic generator for other regions (will be expanded in future sprints)
  const races: Race[] = [];
  for (let i = 0; i < numRaces; i++) {
    const race = generateRace(gameDay);
    race.trackId = track.id;
    race.surface = track.surfaces[Math.floor(Math.random() * track.surfaces.length)];
    races.push(race);
  }

  return races;
}

// Main function: Generate all track races for a given day
export function generateTrackSchedule(
  gameDay: number,
  existingRaces: Race[],
  schedules: TrackSchedule[]
): Race[] {
  const races = [...existingRaces];
  const dayOfYear = getDayOfYear(gameDay);

  // Add graded stakes whose dayOfYear falls on this day
  for (const g of GRADED_RACES) {
    if (g.dayOfYear !== dayOfYear) continue;
    if (races.some((r) => r.graded?.key === g.key && r.day === gameDay)) continue;
    races.push(makeGradedRace(g, gameDay));
  }

  // Generate track-specific races
  for (const schedule of schedules) {
    const track = getTrackById(schedule.trackId);
    if (!track) continue;

    if (isTrackRacing(schedule, gameDay)) {
      const trackRaces = generateTrackRaces(track, schedule, gameDay, races);
      races.push(...trackRaces);
    }
  }

  return races;
}

// Generate upcoming races for the next 7 days
export function generateUpcomingRaces(
  currentRaces: Race[],
  newDay: number,
  schedules: TrackSchedule[]
): Race[] {
  const races = [...currentRaces];

  // Generate races for the next 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const futureDay = newDay + offset;
    const dayRaces = generateTrackSchedule(futureDay, races, schedules);
    
    // Add only new races (avoid duplicates)
    for (const race of dayRaces) {
      if (!races.some((r) => r.id === race.id)) {
        races.push(race);
      }
    }
  }

  return races;
}
