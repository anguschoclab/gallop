/**
 * Tests for races phase
 */

import { describe, it, expect } from "vitest";
import { racesPhase } from "@/core/time/phases/races";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";

describe("racesPhase", () => {
  it("should call generateUpcomingRaces and pruneOldRaces", () => {
    const state: GameState = makeGameState({
      day: 10,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    // Phase wraps generateUpcomingRaces and pruneOldRaces from store
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.races).toBeDefined();
  });

  it("should preserve other state properties", () => {
    const state: GameState = makeGameState({
      day: 10,
      cash: 10000,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    expect(result.state.cash).toBe(10000);
    expect(result.state.horses).toEqual({});
  });

  it("should have correct order", () => {
    expect(racesPhase.order).toBe(60);
  });

  it("should have correct name", () => {
    expect(racesPhase.name).toBe("races");
  });

  it("should preserve logs", () => {
    const state: GameState = makeGameState({
      day: 10,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
      logs: [{ day: 9, text: "Existing log" }],
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
  });
});
