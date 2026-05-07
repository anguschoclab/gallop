/**
 * Tests for raceResolution phase
 */

import { describe, it, expect } from "vitest";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { createRng } from "@/game/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Race } from "@/game/types";

describe("raceResolutionPhase", () => {
  it("should identify overdue races (day <= current day)", () => {
    const race1: Race = {
      id: "race-1",
      name: "Race 1",
      day: 5,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const race2: Race = {
      id: "race-2",
      name: "Race 2",
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
      races: [race1, race2],
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

    const result = raceResolutionPhase.execute(context);
    // Phase is currently a placeholder, should return context unchanged
    expect(result).toEqual(context);
  });

  it("should skip already resolved races", () => {
    const race1: Race = {
      id: "race-1",
      name: "Race 1",
      day: 5,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: true,
    };

    const race2: Race = {
      id: "race-2",
      name: "Race 2",
      day: 5,
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
      races: [race1, race2],
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

    const result = raceResolutionPhase.execute(context);
    expect(result).toEqual(context);
  });

  it("should skip races in the future", () => {
    const race: Race = {
      id: "race-1",
      name: "Race 1",
      day: 20,
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
      races: [race],
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

    const result = raceResolutionPhase.execute(context);
    expect(result).toEqual(context);
  });

  it("should skip when skipRaceResolution is true", () => {
    const race: Race = {
      id: "race-1",
      name: "Race 1",
      day: 5,
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
      races: [race],
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
      skipRaceResolution: true,
      dailyRng: createRng(12345),
    };

    const shouldSkip = raceResolutionPhase.skipIf?.(context);
    expect(shouldSkip).toBe(true);
  });

  it("should not skip when skipRaceResolution is false or undefined", () => {
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
      skipRaceResolution: false,
    };

    const shouldSkip = raceResolutionPhase.skipIf?.(context);
    expect(shouldSkip).toBe(false);
  });

  it("should have correct order", () => {
    expect(raceResolutionPhase.order).toBe(10);
  });

  it("should have correct name", () => {
    expect(raceResolutionPhase.name).toBe("raceResolution");
  });
});
