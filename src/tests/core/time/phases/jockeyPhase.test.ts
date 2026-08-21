import { describe, it, expect } from "vitest";
import { jockeyPhase } from "@/core/time/phases/jockeyPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("jockeyPhase", () => {
  it("should expire player jockey contracts", () => {
    const jockey = {
      id: "jockey-1",
      name: "Test Jockey",
      stableId: "player",
      contractUntil: 5,
      ridingFee: 100,
      fame: 50,
      loyalty: 100,
      isApprentice: false,
      stableAffinity: 50,
      affinityMap: {},
    };
    const state = makeGameState({ jockeys: [jockey as any] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = jockeyPhase.execute(context);
    const updatedJockey = result.state.jockeys!.find((j) => j.id === "jockey-1");
    expect(updatedJockey?.stableId).toBeUndefined();
    expect(updatedJockey?.contractUntil).toBeUndefined();
  });

  it("should initialize Imperial Expansion fields if missing", () => {
    const jockey = {
      id: "jockey-1",
      name: "Test Jockey",
      stableId: "player",
      contractUntil: 100,
      ridingFee: 100,
      fame: 50,
    };
    const state = makeGameState({ jockeys: [jockey as any] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = jockeyPhase.execute(context);
    const updatedJockey = result.state.jockeys!.find((j) => j.id === "jockey-1");
    expect(updatedJockey?.isApprentice).toBe(false);
    expect(updatedJockey?.loyalty).toBe(100);
    expect(updatedJockey?.stableAffinity).toBe(0);
    expect(updatedJockey?.affinityMap).toEqual({});
  });

  it("should refresh free agent pool to at least 20 (default large)", () => {
    const state = makeGameState({ jockeys: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = jockeyPhase.execute(context);
    const freeAgents = result.state.jockeys!.filter((j) => !j.stableId);
    expect(freeAgents.length).toBeGreaterThanOrEqual(20);
  });

  it("should refresh free agent pool to at least 10 with worldSize: small", () => {
    const state = makeGameState({ jockeys: [], worldSize: "small" }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = jockeyPhase.execute(context);
    const freeAgents = result.state.jockeys!.filter((j) => !j.stableId);
    expect(freeAgents.length).toBeGreaterThanOrEqual(10);
    expect(freeAgents.length).toBeLessThan(20);
  });

  it("should refresh free agent pool to at least 15 with worldSize: medium", () => {
    const state = makeGameState({ jockeys: [], worldSize: "medium" }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = jockeyPhase.execute(context);
    const freeAgents = result.state.jockeys!.filter((j) => !j.stableId);
    expect(freeAgents.length).toBeGreaterThanOrEqual(15);
  });

  it("should handle empty jockeys array", () => {
    const state = makeGameState({ jockeys: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = jockeyPhase.execute(context);
    expect(result.state.jockeys!.length).toBeGreaterThanOrEqual(20);
  });

  it("should preserve existing logs", () => {
    const state = makeGameState({ jockeys: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;
    context.logs = [{ day: 0, text: "Previous log" }];

    const result = jockeyPhase.execute(context);
    expect(result.logs).toContainEqual({ day: 0, text: "Previous log" });
  });
});
