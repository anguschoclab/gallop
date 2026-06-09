import { describe, it, expect } from "vitest";
import { auctionsPhase } from "@/core/time/phases/auctions";
import { createRng } from "@/core/common/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

describe("auctionsPhase", () => {
  const createTestState = (): GameState => ({
    ...createDefaultGameState(),
    day: 1,
    cash: 10000,
  });

  const createTestContext = (state: GameState, previousDay = 0, newDay = 1): PipelineContext => ({
    previousDay,
    newDay,
    state,
    logs: [],
    intents: [],
    impacts: [],
    impactLog: [],
    dailyRng: createRng(1),
  });

  it("should not generate sales when no trigger day matches", () => {
    const state = createTestState();
    state.day = 10;

    const context = createTestContext(state, 9, 10);
    const result = auctionsPhase.execute(context);
    expect(result.state.auctions).toEqual([]);
  });

  it("should not generate duplicate sales for same kind", () => {
    const state = createTestState();
    state.day = 60;
    state.auctions = [
      {
        id: "sale-1",
        name: "Spring Weanling Sale",
        day: 60,
        kind: "weanling",
        lots: [],
        resolved: false,
      },
    ];

    const context = createTestContext(state, 59, 60);
    const result = auctionsPhase.execute(context);
    // Should not create duplicate sale
    expect(result.state.auctions?.length).toBe(1);
  });

  it("should prune auctions older than 30 days", () => {
    const state = createTestState();
    state.day = 100;
    state.auctions = [
      {
        id: "sale-1",
        name: "Old Sale",
        day: 50,
        kind: "weanling",
        lots: [],
        resolved: true,
      },
      {
        id: "sale-2",
        name: "Recent Sale",
        day: 80,
        kind: "yearling",
        lots: [],
        resolved: true,
      },
    ];

    const context = createTestContext(state, 99, 100);
    const result = auctionsPhase.execute(context);
    // Sale from day 50 should be pruned (older than 30 days from day 100)
    expect(result.state.auctions?.length).toBe(1);
    expect(result.state.auctions?.[0].id).toBe("sale-2");
  });

  it("should have correct order", () => {
    expect(auctionsPhase.order).toBe(90);
  });

  it("should have correct name", () => {
    expect(auctionsPhase.name).toBe("auctions");
  });

  it("should preserve existing logs", () => {
    const state = createTestState();
    state.day = 10;

    const context = createTestContext(state, 9, 10);
    context.logs = [{ day: 9, text: "Existing log" }];

    const result = auctionsPhase.execute(context);
    expect(result.logs).toContainEqual({ day: 9, text: "Existing log" });
  });

  it("should handle undefined auctions gracefully", () => {
    const state = createTestState();
    state.day = 10;
    state.auctions = undefined as any;

    const context = createTestContext(state, 9, 10);
    const result = auctionsPhase.execute(context);
    expect(result.state.auctions).toEqual([]);
  });
});
