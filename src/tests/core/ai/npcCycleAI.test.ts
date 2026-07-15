import { describe, it, expect } from "vitest";
import {
  createStableAIState,
  getOrCreateStableAIState,
  updateStableAIState,
  pruneAllLearningData,
  getStrategicInsights,
  type NpcAIManager,
} from "@/core/ai/npcCycleAI";
import type { Stable } from "@/game/types";
import { createTestStable } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    cash: 100000,
    personality: "aggressive",
    ...overrides,
  });
}

function createMockManager(stableStates: Record<string, any> = {}): NpcAIManager {
  return {
    stableStates,
    globalDay: 1,
    regionalKings: {},
  };
}

describe("createStableAIState", () => {
  it("initializes with stableId", () => {
    const stable = createMockStable({ id: "test-stable" });
    const state = createStableAIState(stable, 100);
    expect(state.stableId).toBe("test-stable");
  });

  it("initializes with friction=0", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.friction).toBe(0);
  });

  it("initializes with winsAgainstPlayer=0", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.winsAgainstPlayer).toBe(0);
  });

  it("initializes with empty regionalPrestige", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.regionalPrestige).toEqual({});
  });

  it("initializes with lastUpdateDay = currentDay", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 42);
    expect(state.lastUpdateDay).toBe(42);
  });

  it("initializes with personality state matching stable personality", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createStableAIState(stable, 100);
    expect(state.personalityState.personality).toBe("conservative");
  });

  it("initializes with empty learning state", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.learningState.outcomes).toEqual([]);
  });
});

describe("getOrCreateStableAIState", () => {
  it("creates new state if not exists", () => {
    const stable = createMockStable({ id: "new-stable" });
    const manager = createMockManager();
    const state = getOrCreateStableAIState(manager, stable, 100);
    expect(state.stableId).toBe("new-stable");
    expect(manager.stableStates["new-stable"]).toBeDefined();
  });

  it("returns existing state if already exists", () => {
    const stable = createMockStable({ id: "existing-stable" });
    const existingState = createStableAIState(stable, 50);
    const manager = createMockManager({ "existing-stable": existingState });
    const state = getOrCreateStableAIState(manager, stable, 100);
    expect(state.stableId).toBe("existing-stable");
    expect(state.lastUpdateDay).toBe(50); // From existing state
  });

  it("returns a clone (not the same reference)", () => {
    const stable = createMockStable({ id: "existing-stable" });
    const existingState = createStableAIState(stable, 50);
    const manager = createMockManager({ "existing-stable": existingState });
    const state = getOrCreateStableAIState(manager, stable, 100);
    expect(state).not.toBe(existingState);
    expect(state).toEqual(existingState); // Same content
  });
});

describe("updateStableAIState", () => {
  it("updates lastUpdateDay", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 50);
    const newState = updateStableAIState(state, 100);
    expect(newState.lastUpdateDay).toBe(100);
  });

  it("preserves other fields", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 50);
    state.friction = 30;
    const newState = updateStableAIState(state, 100);
    expect(newState.friction).toBe(30);
  });

  it("does not mutate original", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 50);
    const newState = updateStableAIState(state, 100);
    expect(state.lastUpdateDay).toBe(50);
    expect(newState).not.toBe(state);
  });
});

describe("pruneAllLearningData", () => {
  it("returns new manager object", () => {
    const manager = createMockManager();
    const newManager = pruneAllLearningData(manager, 100);
    expect(newManager).not.toBe(manager);
  });

  it("prunes outcomes older than cutoffDay", () => {
    const stable = createMockStable({ id: "s1" });
    const state = createStableAIState(stable, 1);
    // Add some outcomes manually
    state.learningState.outcomes = [
      { context: "test", success: true, value: 10, day: 50, category: "test" } as any,
      { context: "test", success: false, value: 5, day: 150, category: "test" } as any,
    ];
    const manager = createMockManager({ s1: state });
    const newManager = pruneAllLearningData(manager, 100);
    // Outcome at day=50 should be pruned (50 < 100)
    // Outcome at day=150 should remain (150 >= 100)
    expect(newManager.stableStates["s1"].learningState.outcomes.length).toBe(1);
  });

  it("handles empty manager", () => {
    const manager = createMockManager();
    const newManager = pruneAllLearningData(manager, 100);
    expect(newManager.stableStates).toEqual({});
  });
});

describe("getStrategicInsights", () => {
  it("returns null for unknown stableId", () => {
    const manager = createMockManager();
    const insights = getStrategicInsights(manager, "unknown");
    expect(insights).toBeNull();
  });

  it("returns insights for known stableId", () => {
    const stable = createMockStable({ id: "s1" });
    const state = createStableAIState(stable, 50);
    const manager = createMockManager({ s1: state });
    const insights = getStrategicInsights(manager, "s1");
    expect(insights).not.toBeNull();
    expect(insights!.totalDecisions).toBe(0);
    expect(insights!.overallSuccessRate).toBe(0.5);
    expect(insights!.strategyConfidence).toBe(state.personalityState.strategyConfidence);
    expect(insights!.lastUpdate).toBe(50);
  });

  it("calculates overallSuccessRate from outcomes", () => {
    const stable = createMockStable({ id: "s1" });
    const state = createStableAIState(stable, 50);
    state.learningState.outcomes = [
      { context: "test", success: true, value: 10, day: 50, category: "test" } as any,
      { context: "test", success: true, value: 10, day: 51, category: "test" } as any,
      { context: "test", success: false, value: 5, day: 52, category: "test" } as any,
    ];
    const manager = createMockManager({ s1: state });
    const insights = getStrategicInsights(manager, "s1");
    expect(insights!.totalDecisions).toBe(3);
    expect(insights!.overallSuccessRate).toBeCloseTo(2 / 3, 5);
  });
});
