import { describe, it, expect } from "vitest";
import { leaderboardPhase } from "@/core/time/phases/leaderboardPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStallion } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("leaderboardPhase", () => {
  it("should skip when recently updated (< 7 days)", () => {
    const state = makeGameState({
      leaderboardsUpdatedDay: 5,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = leaderboardPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should update leaderboards when 7+ days since last update", () => {
    const stallion = createTestStallion({ id: "stallion-1" });
    const state = makeGameState({
      horses: h2r([stallion]),
      leaderboardsUpdatedDay: 1,
      industryMeanEarnings: 50000,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = leaderboardPhase.execute(context);
    expect(result.state.leaderboardsUpdatedDay).toBe(10);
    expect(result.state.sireLeaderboards).toBeDefined();
  });

  it("should update horse leaderboards", () => {
    const stallion = createTestStallion({ id: "stallion-1" });
    const state = makeGameState({
      horses: h2r([stallion]),
      leaderboardsUpdatedDay: 1,
      industryMeanEarnings: 50000,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = leaderboardPhase.execute(context);
    expect(result.state.horseLeaderboards).toBeDefined();
  });

  it("should update damsire and blue hen leaderboards", () => {
    const stallion = createTestStallion({ id: "stallion-1" });
    const state = makeGameState({
      horses: h2r([stallion]),
      leaderboardsUpdatedDay: 1,
      industryMeanEarnings: 50000,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = leaderboardPhase.execute(context);
    expect(result.state.damsireLeaderboard).toBeDefined();
    expect(result.state.blueHenLeaderboard).toBeDefined();
  });

  it("should add a log entry when updating", () => {
    const stallion = createTestStallion({ id: "stallion-1" });
    const state = makeGameState({
      horses: h2r([stallion]),
      leaderboardsUpdatedDay: 1,
      industryMeanEarnings: 50000,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = leaderboardPhase.execute(context);
    const logEntry = result.logs.find((l) => l.text?.includes("leaderboards"));
    expect(logEntry).toBeDefined();
  });

  it("should handle empty horses gracefully", () => {
    const state = makeGameState({
      horses: {},
      leaderboardsUpdatedDay: 1,
      industryMeanEarnings: 0,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = leaderboardPhase.execute(context);
    expect(result.state.sireLeaderboards).toBeDefined();
  });
});
