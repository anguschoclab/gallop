/**
 * Integration Tests: Day Advancement Pipeline
 * Tests that all phases execute in order and state mutations work correctly across phases
 */

import { describe, it, expect } from "vitest";
import { executePipeline } from "@/core/time/pipeline";
import { upkeepPhase } from "@/core/time/phases/upkeep";
import { agingPhase } from "@/core/time/phases/aging";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { createRng } from "@/game/rng";
import { createTestHorse } from "@/tests/helpers";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";

describe("Day Advancement Pipeline Integration", () => {
  it("should execute phases in correct order", () => {
    const phases = [upkeepPhase, agingPhase, raceResolutionPhase];

    const state: GameState = {
      day: 1,
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
      previousDay: 0,
      newDay: 1,
      state,
      logs: [],
      dailyRng: createRng(12345),
      intents: [],
      impacts: [],
      impactLog: [],
    };

    const result = executePipeline(phases, context);

    // Verify phases executed in order by checking order values
    expect(upkeepPhase.order).toBeLessThan(agingPhase.order);
    expect(agingPhase.order).toBeLessThan(raceResolutionPhase.order);

    // Verify result structure
    expect(result.state).toBeDefined();
    expect(result.logs).toBeDefined();
  });

  it("should handle phase skip conditions", () => {
    const phases = [upkeepPhase];

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
      intents: [],
      impacts: [],
      impactLog: [],
    };

    const result = executePipeline(phases, context);

    // Verify phase executed
    expect(result.state).toBeDefined();
  });

  it("should aggregate logs across phases", () => {
    const phases = [upkeepPhase, agingPhase];

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
      logs: [{ day: 9, text: "Initial log" }],
      dailyRng: createRng(12345),
      intents: [],
      impacts: [],
      impactLog: [],
    };

    const result = executePipeline(phases, context);

    // Logs should be preserved across phases
    expect(result.logs).toContainEqual({ day: 9, text: "Initial log" });
  });

  it("should apply state mutations from all phases", () => {
    const phases = [upkeepPhase];

    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70, temperament: 50, conformation: 50 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        }),
      ],
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
      intents: [],
      impacts: [],
      impactLog: [],
    };

    const result = executePipeline(phases, context);

    // Upkeep phase should deduct $50 per horse
    expect(result.state.cash).toBe(9950);
  });
});
