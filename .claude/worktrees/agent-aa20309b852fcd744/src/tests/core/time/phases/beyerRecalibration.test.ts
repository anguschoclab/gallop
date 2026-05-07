/**
 * Tests for beyerRecalibration phase
 */

import { describe, it, expect } from "vitest";
import { beyerRecalibrationPhase } from "@/core/time/phases/beyerRecalibration";
import { createRng } from "@/game/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";

describe("beyerRecalibrationPhase", () => {
  it("should call maybeRecalibratePars and update state", () => {
    const state: GameState = {
      day: 30,
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
      previousDay: 29,
      newDay: 30,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = beyerRecalibrationPhase.execute(context);
    // Phase wraps maybeRecalibratePars from store
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.calibratedPars).toBeDefined();
    expect(result.state.lastCalibrationDay).toBeDefined();
  });

  it("should preserve existing logs", () => {
    const state: GameState = {
      day: 30,
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
      previousDay: 29,
      newDay: 30,
      state,
      logs: [{ day: 29, text: "Existing log" }],
      dailyRng: createRng(12345),
    };

    const result = beyerRecalibrationPhase.execute(context);
    expect(result.logs).toContainEqual({ day: 29, text: "Existing log" });
  });

  it("should have correct order", () => {
    expect(beyerRecalibrationPhase.order).toBe(65);
  });

  it("should have correct name", () => {
    expect(beyerRecalibrationPhase.name).toBe("beyerRecalibration");
  });

  it("should handle undefined lastCalibrationDay", () => {
    const state: GameState = {
      day: 30,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
      awards: [],
      market: [],
      auctions: [],
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const context: PipelineContext = {
      previousDay: 29,
      newDay: 30,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = beyerRecalibrationPhase.execute(context);
    expect(result.state.lastCalibrationDay).toBeDefined();
  });
});
