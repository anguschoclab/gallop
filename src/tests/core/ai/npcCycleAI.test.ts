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

describe("StableAIState coordination fields", () => {
  it("createStableAIState initializes with undefined strategicDirectives", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.strategicDirectives).toBeUndefined();
  });

  it("createStableAIState initializes with undefined budgetAllocation", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.budgetAllocation).toBeUndefined();
  });

  it("createStableAIState initializes with undefined worldAssessment", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.worldAssessment).toBeUndefined();
  });

  it("createStableAIState initializes with undefined npcRelationships", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.npcRelationships).toBeUndefined();
  });

  it("createStableAIState initializes with undefined narrativeState", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    expect(state.narrativeState).toBeUndefined();
  });

  it("allows setting strategicDirectives after creation", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    state.strategicDirectives = [{ type: "aggressive_expansion", priority: 1, weight: 1.0 }];
    expect(state.strategicDirectives).toHaveLength(1);
    expect(state.strategicDirectives![0].type).toBe("aggressive_expansion");
  });

  it("allows setting budgetAllocation after creation", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    state.budgetAllocation = {
      total: 50000,
      training: 10000,
      facilities: 5000,
      auctions: 20000,
      claiming: 5000,
      breeding: 10000,
    };
    expect(state.budgetAllocation?.total).toBe(50000);
  });

  it("allows setting npcRelationships after creation", () => {
    const stable = createMockStable();
    const state = createStableAIState(stable, 100);
    state.npcRelationships = {
      "npc-2": { trust: 50, allianceType: null, history: [] },
    };
    expect(state.npcRelationships?.["npc-2"]?.trust).toBe(50);
  });
});

describe("NpcAIManager coordination fields", () => {
  it("createMockManager initializes with undefined globalEconomicState", () => {
    const manager = createMockManager();
    expect(manager.globalEconomicState).toBeUndefined();
  });

  it("createMockManager initializes with undefined activeCartels", () => {
    const manager = createMockManager();
    expect(manager.activeCartels).toBeUndefined();
  });

  it("createMockManager initializes with undefined narrativeArcs", () => {
    const manager = createMockManager();
    expect(manager.narrativeArcs).toBeUndefined();
  });

  it("createMockManager initializes with undefined difficultyModulator", () => {
    const manager = createMockManager();
    expect(manager.difficultyModulator).toBeUndefined();
  });

  it("allows setting globalEconomicState after creation", () => {
    const manager = createMockManager();
    manager.globalEconomicState = {
      studFeeTrend: 0.05,
      yearlingPriceIndex: 110,
      claimingMarketActivity: 5,
    };
    expect(manager.globalEconomicState?.studFeeTrend).toBe(0.05);
  });

  it("allows setting activeCartels after creation", () => {
    const manager = createMockManager();
    manager.activeCartels = [
      { id: "cartel-1", memberStableIds: ["npc-1", "npc-2"], type: "breeding" },
    ];
    expect(manager.activeCartels).toHaveLength(1);
  });
});
