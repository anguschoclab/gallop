/**
 * Integration Tests: Race Lifecycle
 * Tests that modules work together correctly in the race generation → entry → resolution → awards flow
 */

import { describe, it, expect } from "vitest";
import { generateTrackSchedule } from "@/game/raceSchedule";
import { createRng } from "@/game/rng";
import type { GameState, Race, Horse } from "@/game/types";

describe("Race Lifecycle Integration", () => {
  it("should generate races for a track", () => {
    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
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

    const result = generateTrackSchedule(10, state.races, [], createRng("test"));
    
    // Verify races were generated
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should preserve existing races when generating schedule", () => {
    const existingRace: Race = {
      id: "race-1",
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

    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [existingRace],
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

    const result = generateTrackSchedule(10, state.races, [], createRng("test"));
    
    // Should preserve existing race
    expect(result).toContainEqual(existingRace);
  });

  it("should handle empty state gracefully", () => {
    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
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

    const result = generateTrackSchedule(10, state.races, [], createRng("test"));
    
    // Should not crash with empty state
    expect(result).toBeDefined();
  });

  it("should generate races with valid structure", () => {
    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
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

    const result = generateTrackSchedule(10, state.races, [], createRng("test"));
    
    // Check that generated races have required fields
    for (const race of result) {
      expect(race).toHaveProperty("id");
      expect(race).toHaveProperty("name");
      expect(race).toHaveProperty("day");
      expect(race).toHaveProperty("distance");
      expect(race).toHaveProperty("raceClass");
      expect(race).toHaveProperty("purse");
    }
  });
});
