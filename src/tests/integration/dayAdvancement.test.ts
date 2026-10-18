/**
 * Integration tests for day advancement through the production executor.
 *
 * These tests intentionally run the compiled GAME_PHASE_DESCRIPTORS schedule
 * rather than calling executePipeline with caller-selected phases.
 */

import { describe, it, expect } from "vitest";
import { runPipelineForDay } from "@/tests/helpers/runPipeline";
import { createTestHorse } from "@/tests/helpers";
import { makeGameState, h2r } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";
import type { CashImpact } from "@/core/resolver/impacts/financialImpacts";

describe("day advancement production path", () => {
  it("runs the registered descriptor schedule and advances the day", () => {
    const state = makeGameState({
      day: 1,
      cash: 10000,
      horses: h2r([createTestHorse({ id: "horse-1" })]),
    }) as GameState;
    const result = runPipelineForDay(state, 2);

    expect(result.state.day).toBe(2);
    expect(result.state.pendingIntents).toEqual([]);
    expect(result.state.cash).toBe(9950);
  });

  it("applies phase-produced impacts through the central impact application phase", () => {
    const state = makeGameState({
      day: 10,
      cash: 10000,
      horses: h2r([createTestHorse({ id: "horse-1" })]),
    }) as GameState;
    const result = runPipelineForDay(state, 11);
    const upkeepImpact = result.impacts.find(
      (impact): impact is CashImpact => impact.type === "cash_change" && impact.amount < 0,
    );

    expect(upkeepImpact?.entityId).toBe("player");
    expect(result.state.cash).toBe(9950);
  });

  it("keeps state mutations inside the executor-owned phase sequence", () => {
    const horse = createTestHorse({ id: "horse-1", name: "Horse 1", age: 3, gender: "colt" });
    const state = makeGameState({
      day: 10,
      cash: 10000,
      horses: h2r([horse]),
    }) as GameState;

    const result = runPipelineForDay(state, 11);

    expect(result.state.horses["horse-1"]).toBeDefined();
    expect(result.state.cash).toBe(9950);
    expect(result.impacts.some((impact) => impact.phase === "upkeep")).toBe(true);
  });
});
