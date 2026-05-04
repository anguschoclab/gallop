/**
 * Tests for core/time/advance functions
 */

import { describe, it, expect, vi } from "vitest";
import { computePlayerRaceDays, advanceMultipleDaysWithRaceDetection } from "./advance";
import type { GameState, Race } from "@/game/types";

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
    const state: GameState = {
      day: 1,
      cash: 5000,
      horses: [],
      races: [],
      pregnancies: [],
      npcStables: [],
      awards: [],
      market: [],
      auctions: [],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
  });

  it("should stop at player race when not in headless mode", () => {
    const state: GameState = {
      day: 1,
      cash: 5000,
      horses: [],
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
      pregnancies: [],
      npcStables: [],
      awards: [],
      market: [],
      auctions: [],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, false);

    expect(result.daysAdvanced).toBe(0); // Stopped before advancing, race on next day
    expect(result.encounteredPlayerRace).toBe(true);
    expect(result.playerRaceDay).toBe(2);
    expect(advanceDayFn).toHaveBeenCalledTimes(0);
  });

  it("should skip player race in headless mode", () => {
    const state: GameState = {
      day: 1,
      cash: 5000,
      horses: [],
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
      pregnancies: [],
      npcStables: [],
      awards: [],
      market: [],
      auctions: [],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, true);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
  });

  it("should ignore resolved races", () => {
    const state: GameState = {
      day: 1,
      cash: 5000,
      horses: [],
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
      pregnancies: [],
      npcStables: [],
      awards: [],
      market: [],
      auctions: [],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, false);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
  });

  it("should ignore races without player entries", () => {
    const state: GameState = {
      day: 1,
      cash: 5000,
      horses: [],
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
      pregnancies: [],
      npcStables: [],
      awards: [],
      market: [],
      auctions: [],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const advanceDayFn = vi.fn();
    const result = advanceMultipleDaysWithRaceDetection(state, 5, advanceDayFn, false);

    expect(result.daysAdvanced).toBe(5);
    expect(result.encounteredPlayerRace).toBe(false);
    expect(advanceDayFn).toHaveBeenCalledTimes(5);
  });
});
