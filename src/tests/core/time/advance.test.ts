/**
 * Tests for core/time/advance functions
 */

import { describe, it, expect } from "vitest";
import { computePlayerRaceDays } from "@/core/time/advance";
import { getCurrentYear } from "@/core/race/schedule";
import type { Race } from "@/game/types";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

describe("computePlayerRaceDays", () => {
  it("should return empty set when no races have player entries", () => {
    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 10,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-1", ownership: makeUnowned()}],
        resolved: false,
      },
    ];

    const result = computePlayerRaceDays(races, 1, 30);
    expect(result.size).toBe(0);
  });

  it("should return days with player entries", () => {
    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 10,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-1", ownership: makePlayerOwned()}],
        resolved: false,
      },
    ];

    const result = computePlayerRaceDays(races, 1, 30);
    expect(result.size).toBe(1);
    expect(result.has(10)).toBe(true);
  });

  it("should filter races outside the date range", () => {
    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 5,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-1", ownership: makePlayerOwned()}],
        resolved: false,
      },
      {
        id: "race-2",
        name: "Test Race 2",
        day: 10,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-2", ownership: makePlayerOwned()}],
        resolved: false,
      },
      {
        id: "race-3",
        name: "Test Race 3",
        day: 20,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-3", ownership: makePlayerOwned()}],
        resolved: false,
      },
    ];

    const result = computePlayerRaceDays(races, 6, 15);
    expect(result.size).toBe(1);
    expect(result.has(10)).toBe(true);
    expect(result.has(5)).toBe(false);
    expect(result.has(20)).toBe(false);
  });

  it("should ignore resolved races", () => {
    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 10,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-1", ownership: makePlayerOwned()}],
        resolved: true,
      },
    ];

    const result = computePlayerRaceDays(races, 1, 30);
    expect(result.size).toBe(0);
  });

  it("should handle multiple races on the same day", () => {
    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 10,
        distance: 2000,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-1", ownership: makePlayerOwned()}],
        resolved: false,
      },
      {
        id: "race-2",
        name: "Test Race 2",
        day: 10,
        distance: 1800,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        minStat: 70,
        fieldSize: 8,
        entries: [{ horseId: "horse-2", ownership: makePlayerOwned()}],
        resolved: false,
      },
    ];

    const result = computePlayerRaceDays(races, 1, 30);
    expect(result.size).toBe(1);
    expect(result.has(10)).toBe(true);
  });
});

describe("Year Advance Integration", () => {
  it("should detect year boundary correctly", () => {
    expect(getCurrentYear(1)).toBe(1);
    expect(getCurrentYear(365)).toBe(1);
    expect(getCurrentYear(366)).toBe(2);
    expect(getCurrentYear(730)).toBe(2);
    expect(getCurrentYear(731)).toBe(3);
  });
});
