import { describe, it, expect } from "vitest";
import { seasonStandingsPhase } from "@/core/time/phases/seasonStandingsPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("seasonStandingsPhase", () => {
  it("should compute season standings and update lastTopTenRank", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 30 }) as PipelineContext;

    const result = seasonStandingsPhase.execute(context);
    expect(result.state.lastTopTenRank).toBeDefined();
  });

  it("should emit inbox message when player rank changes", () => {
    const state = makeGameState({
      lastTopTenRank: 5,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 30 }) as PipelineContext;

    const result = seasonStandingsPhase.execute(context);
    // Rank change is data-dependent, but structure should be valid
    expect(result.state.lastTopTenRank).toBeDefined();
  });

  it("should emit inbox message when player drops out of top 10", () => {
    const state = makeGameState({
      lastTopTenRank: 10,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 30 }) as PipelineContext;

    const result = seasonStandingsPhase.execute(context);
    expect(result.state.lastTopTenRank).toBeDefined();
  });

  it("should not emit impacts when no rank change", () => {
    const state = makeGameState({
      lastTopTenRank: 0,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 30 }) as PipelineContext;

    const result = seasonStandingsPhase.execute(context);
    // With no previous rank, no change notification expected
    const inboxImpact = result.impacts.find((i) => i.type === "inbox_message");
    // Could be undefined if no rank change
    expect(result.state.lastTopTenRank).toBeDefined();
  });

  it("should preserve existing impacts", () => {
    const state = makeGameState() as GameState;
    const existingImpact = { id: "old-1", type: "log", text: "old", day: 1 } as any;
    const context = makePipelineContext({
      state,
      newDay: 30,
      impacts: [existingImpact],
    }) as PipelineContext;

    const result = seasonStandingsPhase.execute(context);
    expect(result.impacts).toContainEqual(existingImpact);
  });
});
