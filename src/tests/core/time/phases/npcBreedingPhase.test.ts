/**
 * Tests for npcBreedingPhase
 */

import { describe, it, expect } from "vitest";
import { npcBreedingPhase } from "@/core/time/phases/npcBreedingPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";

describe("npcBreedingPhase", () => {
  it("should call runNpcBreeding and update state", () => {
    const state: GameState = makeGameState({
      day: 1,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = npcBreedingPhase.execute(context);
    // Phase wraps runNpcBreeding from game/npcBreeding
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.horses).toBeDefined();
    expect(result.state.npcStables).toBeDefined();
    expect(result.state.pregnancies).toBeDefined();
  });

  it("should return unchanged context when no breeding occurs", () => {
    const state: GameState = makeGameState({
      day: 10,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = npcBreedingPhase.execute(context);
    // When no breeding occurs, should return unchanged context
    expect(result).toEqual(context);
  });

  it("should have correct order", () => {
    expect(npcBreedingPhase.order).toBe(38);
  });

  it("should have correct name", () => {
    expect(npcBreedingPhase.name).toBe("npcBreeding");
  });

  it("should preserve existing logs", () => {
    const state: GameState = makeGameState({
      day: 10,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
      logs: [{ day: 9, text: "Existing log" }],
    }) as PipelineContext;

    const result = npcBreedingPhase.execute(context);
    expect(result.logs).toContainEqual({ day: 9, text: "Existing log" });
  });
});
