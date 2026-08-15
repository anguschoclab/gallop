import { describe, it, expect } from "vitest";
import { marketPhase } from "@/core/time/phases/market";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("marketPhase", () => {
  it("should refresh the market", () => {
    const state = makeGameState({ market: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = marketPhase.execute(context);
    expect(result.state.market).toBeDefined();
    expect(Array.isArray(result.state.market)).toBe(true);
  });

  it("should replenish staff pool when below 4", () => {
    const state = makeGameState({ staffPool: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = marketPhase.execute(context);
    expect(result.state.staffPool).toBeDefined();
    expect(result.state.staffPool!.length).toBeGreaterThanOrEqual(4);
  });

  it("should not replenish staff pool when already >= 4", () => {
    const existingStaff = [
      { id: "s1", name: "A", role: "veterinarian" },
      { id: "s2", name: "B", role: "nutritionist" },
      { id: "s3", name: "C", role: "farrier" },
      { id: "s4", name: "D", role: "veterinarian" },
    ];
    const state = makeGameState({ staffPool: existingStaff as any }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = marketPhase.execute(context);
    expect(result.state.staffPool!.length).toBe(4);
  });

  it("should handle empty npcStables gracefully", () => {
    const state = makeGameState({ npcStables: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = marketPhase.execute(context);
    expect(result.state.market).toBeDefined();
    expect(result.impacts).toEqual([]);
  });

  it("should preserve existing context impacts", () => {
    const state = makeGameState() as GameState;
    const existingImpact = { id: "old-1", type: "log", text: "old", day: 1 } as any;
    const context = makePipelineContext({
      state,
      newDay: 1,
      impacts: [existingImpact],
    }) as PipelineContext;

    const result = marketPhase.execute(context);
    expect(result.impacts).toContainEqual(existingImpact);
  });
});
