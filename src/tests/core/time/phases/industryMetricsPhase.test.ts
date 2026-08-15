import { describe, it, expect } from "vitest";
import { industryMetricsPhase } from "@/core/time/phases/industryMetricsPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("industryMetricsPhase", () => {
  it("should skip when recently updated (< 30 days)", () => {
    const state = makeGameState({
      industryEarningsUpdatedDay: 5,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = industryMetricsPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should recompute when not yet updated", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state = makeGameState({
      horses: h2r([horse]),
      industryEarningsUpdatedDay: 0,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 35 }) as PipelineContext;

    const result = industryMetricsPhase.execute(context);
    expect(result.state.industryMeanEarnings).toBeDefined();
    expect(result.state.industryEarningsUpdatedDay).toBe(35);
  });

  it("should recompute when 30+ days since last update", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state = makeGameState({
      horses: h2r([horse]),
      industryEarningsUpdatedDay: 1,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 35 }) as PipelineContext;

    const result = industryMetricsPhase.execute(context);
    expect(result.state.industryEarningsUpdatedDay).toBe(35);
  });

  it("should add a log entry when recomputing", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state = makeGameState({
      horses: h2r([horse]),
      industryEarningsUpdatedDay: 0,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 35 }) as PipelineContext;

    const result = industryMetricsPhase.execute(context);
    const logEntry = result.logs.find((l) => l.text?.includes("Industry mean earnings"));
    expect(logEntry).toBeDefined();
  });

  it("should handle empty horses gracefully", () => {
    const state = makeGameState({
      horses: {},
      industryEarningsUpdatedDay: 0,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 35 }) as PipelineContext;

    const result = industryMetricsPhase.execute(context);
    expect(result.state.industryMeanEarnings).toBeDefined();
  });
});
