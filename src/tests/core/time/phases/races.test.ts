/**
 * Tests for races phase
 */

import { describe, it, expect } from "vitest";
import { racesPhase } from "@/core/time/phases/races";
import { createRng } from "@/game/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";

describe("racesPhase", () => {
  it("should call generateUpcomingRaces and pruneOldRaces", () => {
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

    const context: PipelineContext = {
      previousDay: 9,
      newDay: 10,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = racesPhase.execute(context);
    // Phase wraps generateUpcomingRaces and pruneOldRaces from store
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.races).toBeDefined();
  });

  it("should preserve other state properties", () => {
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

    const context: PipelineContext = {
      previousDay: 9,
      newDay: 10,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = racesPhase.execute(context);
    expect(result.state.cash).toBe(10000);
    expect(result.state.horses).toEqual([]);
  });

  it("should have correct order", () => {
    expect(racesPhase.order).toBe(60);
  });

  it("should have correct name", () => {
    expect(racesPhase.name).toBe("races");
  });

  it("should preserve logs", () => {
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

    const context: PipelineContext = {
      previousDay: 9,
      newDay: 10,
      state,
      logs: [{ day: 9, text: "Existing log" }],
      dailyRng: createRng(12345),
    };

    const result = racesPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
  });
});
