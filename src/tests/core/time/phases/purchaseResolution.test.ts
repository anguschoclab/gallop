/**
 * Tests for purchase resolution phase
 */

import { describe, it, expect } from "vitest";
import { purchaseResolutionPhase } from "@/core/time/phases/purchaseResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { PurchaseIntent } from "@/core/resolver/intents";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";

describe("purchaseResolutionPhase", () => {
  const createTestState = (): GameState =>
    makeGameState({
      day: 1,
      cash: 10000,
      pendingIntents: [],
    }) as GameState;

  const createTestContext = (state: GameState, intents: PurchaseIntent[] = []): PipelineContext =>
    createMockPipelineContext({ state, intents });

  it("should process purchase intent and generate horse transfer impact", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [],
      market: [horse],
    };

    const intent: PurchaseIntent = {
      id: "intent-1",
      day: 1,
      type: "purchase",
      entityId: "player",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      price: 5000,
    };

    const context = createTestContext(state, [intent]);
    const result = purchaseResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0].type).toBe("horse_transfer");
  });

  it("should remove horse from market after purchase", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [],
      market: [horse],
    };

    const intent: PurchaseIntent = {
      id: "intent-1",
      day: 1,
      type: "purchase",
      entityId: "player",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      price: 5000,
    };

    const context = createTestContext(state, [intent]);
    const result = purchaseResolutionPhase.execute(context);

    expect(result.state.market).toHaveLength(0);
  });

  it("should skip non-purchase intents", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const context = createTestContext(state, [] as any);
    const result = purchaseResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
  });

  it("should have correct order", () => {
    expect(purchaseResolutionPhase.order).toBe(35);
  });

  it("should have correct name", () => {
    expect(purchaseResolutionPhase.name).toBe("purchaseResolution");
  });
});
