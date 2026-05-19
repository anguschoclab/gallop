/**
 * Tests for core/time/advance functions
 */

import { describe, it, expect, vi } from "vitest";
import { computePlayerRaceDays, advanceMultipleDaysWithRaceDetection } from "@/core/time/advance";
import { getCurrentYear } from "@/game/raceSchedule";
import type { GameState, Race, Horse } from "@/game/types";
import { makeGameState } from "@/tests/helpers/sampleGameState";

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
        entries: [{ horseId: "horse-1", owned: false, npc: true }],
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
        entries: [{ horseId: "horse-1", owned: true, npc: false }],
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
        entries: [{ horseId: "horse-1", owned: true, npc: false }],
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
        entries: [{ horseId: "horse-2", owned: true, npc: false }],
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
        entries: [{ horseId: "horse-3", owned: true, npc: false }],
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
        entries: [{ horseId: "horse-1", owned: true, npc: false }],
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
        entries: [{ horseId: "horse-1", owned: true, npc: false }],
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
        entries: [{ horseId: "horse-2", owned: true, npc: false }],
        resolved: false,
      },
    ];

    const result = computePlayerRaceDays(races, 1, 30);
    expect(result.size).toBe(1);
    expect(result.has(10)).toBe(true);
  });
});

describe("advanceMultipleDaysWithRaceDetection", () => {
  it("should advance all days when no player races encountered", () => {
    const state = makeGameState({
      day: 1,
      cash: 5000,
      races: [],
    }) as GameState;

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
  });

  it("should stop at player race when not in headless mode", () => {
    const state = makeGameState({
      day: 1,
      cash: 5000,
      races: [
        {
          id: "race-1",
          name: "Test Race",
          day: 2,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", owned: true, npc: false }],
          resolved: false,
        },
      ],
    }) as GameState;

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, false);

    expect(result.daysAdvanced).toBe(0); // Stopped before advancing, race on next day
    expect(result.encounteredPlayerRace).toBe(true);
    expect(result.playerRaceDay).toBe(2);
    expect(advanceDayFn).toHaveBeenCalledTimes(0);
  });

  it("should skip player race in headless mode", () => {
    const state = makeGameState({
      day: 1,
      cash: 5000,
      races: [
        {
          id: "race-1",
          name: "Test Race",
          day: 3,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", owned: true, npc: false }],
          resolved: false,
        },
      ],
    }) as GameState;

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, true);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
  });

  it("should ignore resolved races", () => {
    const state = makeGameState({
      day: 1,
      cash: 5000,
      races: [
        {
          id: "race-1",
          name: "Test Race",
          day: 3,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", owned: true, npc: false }],
          resolved: true,
        },
      ],
    }) as GameState;

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, false);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
  });

  it("should ignore races without player entries", () => {
    const state = makeGameState({
      day: 1,
      cash: 5000,
      races: [
        {
          id: "race-1",
          name: "Test Race",
          day: 3,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", owned: false, npc: true }],
          resolved: false,
        },
      ],
    }) as GameState;

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, false);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
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

  it("should advance full year in headless mode", () => {
    const state = makeGameState({
      day: 1,
      cash: 5000,
      races: [],
    }) as GameState;

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 365, advanceDayFn, true);

    expect(result.daysAdvanced).toBe(365);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(365);
  });

  it("should handle year boundary with player races", () => {
    const state = makeGameState({
      day: 360, // Near end of year 1
      cash: 5000,
      races: [
        {
          id: "race-1",
          name: "Test Race",
          day: 365, // In year 2, within advance range
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", owned: true, npc: false }],
          resolved: false,
        },
      ],
    }) as GameState;

    const advanceDayFn = vi.fn(() => {
      state.day++;
    });
    const result = advanceMultipleDaysWithRaceDetection(state, 10, advanceDayFn, false);

    // Should stop at the player race
    expect(result.daysAdvanced).toBeLessThan(10);
    expect(result.encounteredPlayerRace).toBe(true);
    expect(result.playerRaceDay).toBe(365);
  });

  it("should skip player races across year boundary in headless mode", () => {
    const state = makeGameState({
      day: 360, // Near end of year 1
      cash: 5000,
      races: [
        {
          id: "race-1",
          name: "Test Race",
          day: 400, // In year 2
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", owned: true, npc: false }],
          resolved: false,
        },
      ],
    }) as GameState;

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 50, advanceDayFn, true);

    // Should skip player race in headless mode
    expect(result.daysAdvanced).toBe(50);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(50);
  });
});
