/**
 * Tests for race schedule generation
 */

import { describe, it, expect } from "vitest";
import {
  getCurrentYear,
  getDayOfWeek,
  isTrackRacing,
  generateTrackRaces,
  generateTrackSchedule,
  generateUpcomingRaces,
  generateAnnualCalendar,
} from "@/core/race/schedule";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { createRng } from "@/core/common/rng";
import type { Race } from "@/game/types";
import type { Track, TrackSchedule } from "@/data/tracks";
import { TRACK_SCHEDULES } from "@/data/tracks";
import { GRADED_RACES_BY_DAY_OF_YEAR } from "@/data/gradedRaces";

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

describe("dayOfYear", () => {
  it("should return day of year correctly", () => {
    expect(dayOfYear(1)).toBe(1);
    expect(dayOfYear(365)).toBe(365);
    expect(dayOfYear(366)).toBe(1);
    expect(dayOfYear(730)).toBe(365);
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
      courses: [
        {
          surface: "Dirt",
          circumference: 2000,
          straightLength: 400,
          sections: [
            { type: "straight", length: 400 },
            { type: "turn", length: 600, radius: 191 },
            { type: "straight", length: 400 },
            { type: "turn", length: 600, radius: 191 },
          ],
        },
      ],
    };

    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    const races = generateTrackRaces(track, schedule, 10, createRng("test"));
    expect(races.length).toBeGreaterThan(0);
    expect(races.length).toBeLessThanOrEqual(10);
  });

  it("should generate races with track ID", () => {
    const track: Track = {
      id: "track-1",
      name: "Test Track",
      country: "USA",
      courses: [
        {
          surface: "Dirt",
          circumference: 2000,
          straightLength: 400,
          sections: [
            { type: "straight", length: 400 },
            { type: "turn", length: 600, radius: 191 },
            { type: "straight", length: 400 },
            { type: "turn", length: 600, radius: 191 },
          ],
        },
      ],
    };

    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    const races = generateTrackRaces(track, schedule, 10, createRng("test"));
    expect(races.every((r) => r.trackId === "track-1")).toBe(true);
  });

  it("should generate races with correct day", () => {
    const track: Track = {
      id: "track-1",
      name: "Test Track",
      country: "USA",
      courses: [
        {
          surface: "Dirt",
          circumference: 2000,
          straightLength: 400,
          sections: [
            { type: "straight", length: 400 },
            { type: "turn", length: 600, radius: 191 },
            { type: "straight", length: 400 },
            { type: "turn", length: 600, radius: 191 },
          ],
        },
      ],
    };

    const schedule: TrackSchedule = {
      trackId: "track-1",
      raceDays: [0],
      racesPerDay: [8, 10],
      regionalSystem: "north_america",
    };

    const races = generateTrackRaces(track, schedule, 10, createRng("test"));
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

    const races = generateUpcomingRaces(currentRaces, 1, schedules);
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
    const races = generateUpcomingRaces([existingRace], 1, schedules);
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
    const races = generateUpcomingRaces([existingRace], 1, schedules);
    const count = races.filter((r) => r.id === existingRace.id).length;
    expect(count).toBe(1);
  });
});

describe("generateAnnualCalendar", () => {
  it("should generate graded races for a year", () => {
    const year = 1;
    const existingRaces: Race[] = [];

    const races = generateAnnualCalendar(year, existingRaces);
    expect(races.length).toBeGreaterThan(0);
  });

  it("should preserve existing races", () => {
    const year = 1;
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

    const races = generateAnnualCalendar(year, [existingRace]);
    expect(races).toContain(existingRace);
  });

  it("should not duplicate races for the same year", () => {
    const year = 1;
    const races1 = generateAnnualCalendar(year, []);
    const races2 = generateAnnualCalendar(year, races1);

    // Should not add duplicate races
    expect(races2.length).toBe(races1.length);
  });

  it("should generate races with correct day range for year", () => {
    const year = 1;
    const races = generateAnnualCalendar(year, []);

    const yearRaces = races.filter((r) => r.day >= 1 && r.day <= 365);
    expect(yearRaces.length).toBe(races.length);
  });

  it("should generate races for year 2 with correct day range", () => {
    const year = 2;
    const races = generateAnnualCalendar(year, []);

    const yearRaces = races.filter((r) => r.day >= 366 && r.day <= 730);
    expect(yearRaces.length).toBe(races.length);
  });

  it("should apply day of year variance", () => {
    const year = 1;
    const races = generateAnnualCalendar(year, []);

    // All races should have valid day of year (1-365)
    races.forEach((race) => {
      const doy = dayOfYear(race.day);
      expect(doy).toBeGreaterThanOrEqual(1);
      expect(doy).toBeLessThanOrEqual(365);
    });
  });
});

describe("generateTrackSchedule — optimized", () => {
  it("with full TRACK_SCHEDULES (126), completes without timeout", () => {
    const start = Date.now();
    const result = generateTrackSchedule(10, [], TRACK_SCHEDULES, createRng("test"));
    const elapsed = Date.now() - start;
    expect(result).toBeDefined();
    expect(elapsed).toBeLessThan(2000);
  });

  it("no duplicate graded races when same day generated twice", () => {
    const day1 = generateTrackSchedule(10, [], TRACK_SCHEDULES, createRng("test"));
    const day2 = generateTrackSchedule(10, day1, TRACK_SCHEDULES, createRng("test"));
    const gradedRaces = day2.filter((r) => r.graded);
    const keys = gradedRaces.map((r) => `${r.graded!.key}_${r.day}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("graded races match GRADED_RACES_BY_DAY_OF_YEAR lookup", () => {
    const doy = dayOfYear(10);
    const expected = GRADED_RACES_BY_DAY_OF_YEAR.get(doy) ?? [];
    const result = generateTrackSchedule(10, [], [], createRng("test"));
    const gradedResult = result.filter((r) => r.graded);
    expect(gradedResult.length).toBe(expected.length);
    for (const r of gradedResult) {
      expect(expected.some((g) => g.key === r.graded!.key)).toBe(true);
    }
  });

  it("existing races preserved in output", () => {
    const existing: Race = {
      id: "preserve-1",
      name: "Test",
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
    const result = generateTrackSchedule(10, [existing], [], createRng("test"));
    expect(result).toContain(existing);
  });

  it("empty schedules + no graded races on that day returns only existing", () => {
    // Find a day with no graded races
    const usedDays = new Set(GRADED_RACES_BY_DAY_OF_YEAR.keys());
    let emptyDoy = 1;
    while (usedDays.has(emptyDoy)) emptyDoy++;
    // Convert doy to a game day (year 1)
    const gameDay = emptyDoy;
    const existing: Race = {
      id: "only-1",
      name: "Only Race",
      day: gameDay,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };
    const result = generateTrackSchedule(gameDay, [existing], [], createRng("test"));
    expect(result).toEqual([existing]);
  });
});

describe("generateUpcomingRaces — optimized", () => {
  it("with full TRACK_SCHEDULES (126), completes in < 2s", () => {
    const start = Date.now();
    const result = generateUpcomingRaces([], 1, TRACK_SCHEDULES);
    const elapsed = Date.now() - start;
    expect(result).toBeDefined();
    expect(elapsed).toBeLessThan(2000);
  });

  it("no duplicate race IDs in output", () => {
    const result = generateUpcomingRaces([], 1, TRACK_SCHEDULES);
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all generated races have day in (newDay, newDay+7]", () => {
    const newDay = 10;
    const result = generateUpcomingRaces([], newDay, TRACK_SCHEDULES);
    for (const race of result) {
      expect(race.day).toBeGreaterThan(newDay);
      expect(race.day).toBeLessThanOrEqual(newDay + 7);
    }
  });

  it("existing races preserved", () => {
    const existing: Race = {
      id: "existing-upcoming-1",
      name: "Existing",
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
    const result = generateUpcomingRaces([existing], 1, TRACK_SCHEDULES);
    expect(result).toContain(existing);
  });

  it("deterministic: same inputs produce same race IDs", () => {
    const r1 = generateUpcomingRaces([], 1, TRACK_SCHEDULES);
    const r2 = generateUpcomingRaces([], 1, TRACK_SCHEDULES);
    const ids1 = r1.map((r) => r.id).sort();
    const ids2 = r2.map((r) => r.id).sort();
    expect(ids1).toEqual(ids2);
  });

  it("with 10K pre-existing races, completes in < 5s (stress test)", () => {
    const bigRaces: Race[] = [];
    for (let i = 0; i < 10000; i++) {
      bigRaces.push({
        id: `stress-${i}`,
        name: `Stress ${i}`,
        day: i + 1,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [],
        resolved: false,
      });
    }
    const start = Date.now();
    const result = generateUpcomingRaces(bigRaces, 1, TRACK_SCHEDULES);
    const elapsed = Date.now() - start;
    expect(result.length).toBeGreaterThan(bigRaces.length);
    expect(elapsed).toBeLessThan(5000);
  });
});

describe("generateAnnualCalendar — optimized", () => {
  it("no duplicate races when called twice for same year", () => {
    const r1 = generateAnnualCalendar(1, []);
    const r2 = generateAnnualCalendar(1, r1);
    expect(r2.length).toBe(r1.length);
  });

  it("existing races preserved", () => {
    const existing: Race = {
      id: "annual-existing-1",
      name: "Annual Existing",
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
    const result = generateAnnualCalendar(1, [existing]);
    expect(result).toContain(existing);
  });

  it("all races within year 1 day range [1, 365]", () => {
    const races = generateAnnualCalendar(1, []);
    for (const race of races) {
      expect(race.day).toBeGreaterThanOrEqual(1);
      expect(race.day).toBeLessThanOrEqual(365);
    }
  });

  it("all races within year 2 day range [366, 730]", () => {
    const races = generateAnnualCalendar(2, []);
    for (const race of races) {
      expect(race.day).toBeGreaterThanOrEqual(366);
      expect(race.day).toBeLessThanOrEqual(730);
    }
  });
});
