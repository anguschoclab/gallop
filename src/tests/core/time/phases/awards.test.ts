/**
 * Tests for awards phase
 */

import { describe, it, expect } from "vitest";
import { awardsPhase } from "@/core/time/phases/awards";
import { createRng } from "@/game/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Horse, Race } from "@/game/types";

describe("awardsPhase", () => {
  it("should return unchanged context when no ceremony scheduled", () => {
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

    const result = awardsPhase.execute(context);
    expect(result).toEqual(context);
  });

  it("should skip if already processed this year for region", () => {
    const state: GameState = {
      day: 365, // Year end
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
      lastAwardYear: {
        north_america: 1,
        europe: 1,
        asia_pacific: 1,
        south_america: 1,
      },
    };

    const context: PipelineContext = {
      previousDay: 364,
      newDay: 365,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = awardsPhase.execute(context);
    expect(result.state.awards).toEqual([]);
  });

  it("should have correct order", () => {
    expect(awardsPhase.order).toBe(95);
  });

  it("should have correct name", () => {
    expect(awardsPhase.name).toBe("awards");
  });

  it("should preserve state when no winners determined", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "horse",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const state: GameState = {
      day: 365,
      cash: 10000,
      horses: [horse],
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
      previousDay: 364,
      newDay: 365,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = awardsPhase.execute(context);
    expect(result.state.horses).toEqual([horse]);
    expect(result.state.awards).toEqual([]);
  });

  it("should update lastAwardYear even with no winners", () => {
    const state: GameState = {
      day: 365,
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
      previousDay: 364,
      newDay: 365,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = awardsPhase.execute(context);
    expect(result.state.lastAwardYear?.north_america).toBe(1);
  });

  it("should preserve existing logs", () => {
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
    };

    const result = awardsPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
  });
});
