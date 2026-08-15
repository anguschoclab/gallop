import { describe, it, expect } from "vitest";
import { impactApplicationPhase } from "@/core/time/phases/impactApplication";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("impactApplicationPhase", () => {
  it("should apply impacts and return updated state", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = impactApplicationPhase.execute(context);
    expect(result.state).toBeDefined();
    expect(result.impactLog).toBeDefined();
  });

  it("should handle empty impacts gracefully", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 10, impacts: [] }) as PipelineContext;

    const result = impactApplicationPhase.execute(context);
    expect(result.state).toBeDefined();
  });

  it("should cap seasonRecords at max size", () => {
    const oversizedRecords = Array.from({ length: 200 }, (_, i) => ({
      day: i,
      year: 1,
      earnings: 1000,
    }));
    const state = makeGameState({
      seasonRecords: oversizedRecords as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = impactApplicationPhase.execute(context);
    expect(result.state.seasonRecords!.length).toBeLessThanOrEqual(200);
  });

  it("should cap hallOfFame at max size", () => {
    const oversizedHOF = Array.from({ length: 200 }, (_, i) => ({
      horseId: `horse-${i}`,
      name: `Horse ${i}`,
      inductionDay: i,
      inductionYear: 1,
      achievements: [],
      lifetimeEarnings: 0,
      lifetimeStarts: 0,
      lifetimeWins: 0,
      g1Wins: 0,
      bestBeyer: 0,
    }));
    const state = makeGameState({
      hallOfFame: oversizedHOF as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = impactApplicationPhase.execute(context);
    expect(result.state.hallOfFame!.length).toBeLessThanOrEqual(200);
  });

  it("should preserve context newDay", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 42 }) as PipelineContext;

    const result = impactApplicationPhase.execute(context);
    expect(result.newDay).toBe(42);
  });
});
