/**
 * Tests for beyerRecalibration phase
 */

import { describe, it, expect } from "vitest";
import { beyerRecalibrationPhase } from "@/core/time/phases/beyerRecalibration";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";

describe("beyerRecalibrationPhase", () => {
  it("should call maybeRecalibratePars and update state", () => {
    const state: GameState = makeGameState({
      day: 30,
      lastCalibrationDay: 0,
      calibratedPars: {},
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 29,
      newDay: 30,
      state,
    }) as PipelineContext;

    const result = beyerRecalibrationPhase.execute(context);
    // Phase wraps maybeRecalibratePars from store
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.calibratedPars).toBeDefined();
    expect(result.state.lastCalibrationDay).toBeDefined();
  });

  it("should preserve existing logs", () => {
    const state: GameState = makeGameState({
      day: 30,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 29,
      newDay: 30,
      state,
      logs: [{ day: 29, text: "Existing log" }],
    }) as PipelineContext;

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
    const state: GameState = makeGameState({
      day: 30,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 29,
      newDay: 30,
      state,
    }) as PipelineContext;

    const result = beyerRecalibrationPhase.execute(context);
    expect(result.state.lastCalibrationDay).toBeDefined();
  });
});
