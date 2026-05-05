/**
 * Tests for race schedule generation
 */

import { describe, it, expect } from "vitest";
import {
  getCurrentYear,
  getDayOfYear,
  getDayOfWeek,
  isTrackRacing,
  generateTrackRaces,
  generateTrackSchedule,
  generateUpcomingRaces,
} from "@/game/raceSchedule";
import { createRng } from "@/game/rng";
import type { Race } from "@/game/types";
import type { Track, TrackSchedule } from "@/game/tracks";

describe("getCurrentYear", () => {
  it("should return year 1 for days 1-365", () => {
    expect(getCurrentYear(1)).toBe(1);
    expect(getCurrentYear(100)).toBe(1);
    expect(getCurrentYear(365)).toBe(1);
  });

  it("should return year 2 for days 366-730", () => {
    expect(getCurrentYear(366)).toBe(2);
    expect(getCurrentYear(500)).toBe(2);
    expect(getCurrentYear(730)).toBe(2);
  });

  it("should return year 3 for days 731-1095", () => {
    expect(getCurrentYear(731)).toBe(3);
    expect(getCurrentYear(1000)).toBe(3);
    expect(getCurrentYear(1095)).toBe(3);
  });
});

describe("getDayOfYear", () => {
  it("should return day of year correctly", () => {
    expect(getDayOfYear(1)).toBe(1);
    expect(getDayOfYear(365)).toBe(365);
    expect(getDayOfYear(366)).toBe(1);
    expect(getDayOfYear(730)).toBe(365);
  });
});

describe("getDayOfWeek", () => {
  it("should return day of week correctly", () => {
    expect(getDayOfWeek(1)).toBe(0); // Sunday
    expect(getDayOfWeek(2)).toBe(1);
    expect(getDayOfWeek(7)).toBe(6); // Saturday
    expect(getDayOfWeek(8)).toBe(0);
  });
});

describe("isTrackRacing", () => {
  it("should return false when day of week not in race days", () => {
    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0, 6], // Sunday, Saturday
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    expect(isTrackRacing(schedule, 2)).toBe(false); // Monday
    expect(isTrackRacing(schedule, 3)).toBe(false);
  });

  it("should return true when day of week is in race days", () => {
    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0, 6],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    expect(isTrackRacing(schedule, 1)).toBe(true); // Sunday
    expect(isTrackRacing(schedule, 7)).toBe(true); // Saturday
  });

  it("should return false when before meet start", () => {
    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0, 1, 2, 3, 4, 5, 6],
      racesPerDay: [8, 10],
      meetStart: 100,
      meetEnd: 200,
      regionalSystem: "north_america",
    };

    expect(isTrackRacing(schedule, 50)).toBe(false);
  });

  it("should return false when after meet end", () => {
    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0, 1, 2, 3, 4, 5, 6],
      racesPerDay: [8, 10],
      meetStart: 100,
      meetEnd: 200,
      regionalSystem: "north_america",
    };

    expect(isTrackRacing(schedule, 250)).toBe(false);
  });

  it("should return true when within meet dates", () => {
    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0, 1, 2, 3, 4, 5, 6],
      racesPerDay: [8, 10],
      meetStart: 100,
      meetEnd: 200,
      regionalSystem: "north_america",
    };

    expect(isTrackRacing(schedule, 150)).toBe(true);
  });
});

describe("generateTrackRaces", () => {
  it("should generate races for north american tracks", () => {
    const track: Track = {
      id: "track-1",
      name: "Test Track",
      country: "USA",
      surfaces: ["Dirt"],
    };

    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    const races = generateTrackRaces(track, schedule, 10, []);
    expect(races.length).toBeGreaterThan(0);
    expect(races.length).toBeLessThanOrEqual(10);
  });

  it("should generate races with track ID", () => {
    const track: Track = {
      id: "track-1",
      name: "Test Track",
      country: "USA",
      surfaces: ["Dirt"],
    };

    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    const races = generateTrackRaces(track, schedule, 10, []);
    expect(races.every((r) => r.trackId === "track-1")).toBe(true);
  });

  it("should generate races with correct day", () => {
    const track: Track = {
      id: "track-1",
      name: "Test Track",
      country: "USA",
      surfaces: ["Dirt"],
    };

    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    const races = generateTrackRaces(track, schedule, 10, []);
    expect(races.every((r) => r.day === 10)).toBe(true);
  });
});

describe("generateTrackSchedule", () => {
  it("should return empty array when no schedules provided", () => {
    const schedules: TrackSchedule[] = [];
    const races = generateTrackSchedule(10, [], schedules, createRng("test"));
    expect(races).toEqual([]);
  });

  it("should preserve existing races", () => {
    const existingRace: Race = {
      id: "existing-1",
      name: "Existing Race",
      day: 10,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const schedules: TrackSchedule[] = [];
    const races = generateTrackSchedule(10, [existingRace], schedules, createRng("test"));
    expect(races).toContain(existingRace);
  });

  it("should skip track races when track not found", () => {
    const schedule: TrackSchedule = {
      trackId: "nonexistent-track",
      raceDays: [0],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    const races = generateTrackSchedule(1, [], [schedule], createRng("test"));
    // Should not crash, just return empty since track doesn't exist
    expect(races).toEqual([]);
  });
});

describe("generateUpcomingRaces", () => {
  it("should generate races for next 7 days", () => {
    const currentRaces: Race[] = [];
    const schedules: TrackSchedule[] = [];

    const races = generateUpcomingRaces(currentRaces, 1, schedules, createRng("test"));
    expect(races.length).toBeGreaterThanOrEqual(currentRaces.length);
  });

  it("should preserve existing races", () => {
    const existingRace: Race = {
      id: "existing-1",
      name: "Existing Race",
      day: 1,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const schedules: TrackSchedule[] = [];
    const races = generateUpcomingRaces([existingRace], 1, schedules, createRng("test"));
    expect(races).toContain(existingRace);
  });

  it("should avoid duplicate races", () => {
    const existingRace: Race = {
      id: "existing-1",
      name: "Existing Race",
      day: 2,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const schedules: TrackSchedule[] = [];
    const races = generateUpcomingRaces([existingRace], 1, schedules, createRng("test"));

    // Count how many times the existing race appears
    const count = races.filter((r) => r.id === existingRace.id).length;
    expect(count).toBe(1);
  });
});
