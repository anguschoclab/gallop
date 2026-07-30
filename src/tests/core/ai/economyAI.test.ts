/**
 * Tests for economyAI - Global economic state management
 * Tests economic trend tracking, stud fee calculation, yearling price index,
 * claiming market activity, and economic signal generation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createEconomicState,
  updateEconomicTrends,
  calculateStudFeeAdjustment,
  calculateYearlingPriceAdjustment,
  getEconomicSignal,
  processEconomicCycle,
  trackClaimingActivity,
} from "@/core/ai/economyAI";
import type { Stable, GameState } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import type { EconomicTrend } from "@/core/ai/strategicCoordinator";
import { createTestStable } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    name: "Test Stable",
    cash: 100000,
    personality: "aggressive",
    ...overrides,
  });
}

function createMockAIState(stableId: string): StableAIState {
  return {
    stableId,
    personalityState: { personality: "aggressive" } as any,
    learningState: { outcomes: [], adaptations: {} } as any,
    lastUpdateDay: 1,
    friction: 0,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
  } as any;
}

function createMockManager(): NpcAIManager {
  return {
    stableStates: { s1: createMockAIState("s1"), s2: createMockAIState("s2") },
    globalDay: 100,
    regionalKings: {},
  };
}

describe("createEconomicState", () => {
  it("returns an EconomicTrend with default baseline values", () => {
    const state = createEconomicState();
    expect(state.studFeeTrend).toBe(0);
    expect(state.yearlingPriceIndex).toBe(100);
    expect(state.claimingMarketActivity).toBe(0);
  });
});

describe("updateEconomicTrends", () => {
  it("returns updated EconomicTrend based on game state", () => {
    const current: EconomicTrend = createEconomicState();
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createMockStable({ id: "s1", cash: 200000 }),
        createMockStable({ id: "s2", cash: 50000 }),
      ],
      day: 100,
    } as unknown as GameState;
    const result = updateEconomicTrends(current, mockState, 100);
    expect(result).toBeDefined();
    expect(typeof result.studFeeTrend).toBe("number");
    expect(typeof result.yearlingPriceIndex).toBe("number");
    expect(typeof result.claimingMarketActivity).toBe("number");
  });

  it("adjusts yearlingPriceIndex based on market activity", () => {
    const current: EconomicTrend = {
      studFeeTrend: 0,
      yearlingPriceIndex: 100,
      claimingMarketActivity: 5,
    };
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [createMockStable({ id: "s1", cash: 500000 })],
      day: 100,
    } as unknown as GameState;
    const result = updateEconomicTrends(current, mockState, 100);
    // With high NPC cash, price index should trend upward
    expect(result.yearlingPriceIndex).not.toBe(100);
  });

  it("preserves baseline when no market activity", () => {
    const current: EconomicTrend = createEconomicState();
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [],
      day: 100,
    } as unknown as GameState;
    const result = updateEconomicTrends(current, mockState, 100);
    expect(result.yearlingPriceIndex).toBe(100);
    expect(result.studFeeTrend).toBe(0);
  });
});

describe("calculateStudFeeAdjustment", () => {
  it("returns positive adjustment when studFeeTrend is positive", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0.1,
      yearlingPriceIndex: 100,
      claimingMarketActivity: 0,
    };
    const result = calculateStudFeeAdjustment(trend, 10000);
    expect(result).toBeGreaterThan(10000);
  });

  it("returns negative adjustment when studFeeTrend is negative", () => {
    const trend: EconomicTrend = {
      studFeeTrend: -0.1,
      yearlingPriceIndex: 100,
      claimingMarketActivity: 0,
    };
    const result = calculateStudFeeAdjustment(trend, 10000);
    expect(result).toBeLessThan(10000);
  });

  it("returns base fee when studFeeTrend is zero", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0,
      yearlingPriceIndex: 100,
      claimingMarketActivity: 0,
    };
    const result = calculateStudFeeAdjustment(trend, 10000);
    expect(result).toBe(10000);
  });
});

describe("calculateYearlingPriceAdjustment", () => {
  it("returns higher price when yearlingPriceIndex > 100", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0,
      yearlingPriceIndex: 120,
      claimingMarketActivity: 0,
    };
    const result = calculateYearlingPriceAdjustment(trend, 50000);
    expect(result).toBeGreaterThan(50000);
  });

  it("returns lower price when yearlingPriceIndex < 100", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0,
      yearlingPriceIndex: 80,
      claimingMarketActivity: 0,
    };
    const result = calculateYearlingPriceAdjustment(trend, 50000);
    expect(result).toBeLessThan(50000);
  });

  it("returns base price when index is 100", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0,
      yearlingPriceIndex: 100,
      claimingMarketActivity: 0,
    };
    const result = calculateYearlingPriceAdjustment(trend, 50000);
    expect(result).toBe(50000);
  });
});

describe("getEconomicSignal", () => {
  it("returns 'bull' when yearlingPriceIndex is high and studFeeTrend positive", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0.1,
      yearlingPriceIndex: 120,
      claimingMarketActivity: 10,
    };
    const signal = getEconomicSignal(trend);
    expect(signal).toBe("bull");
  });

  it("returns 'bear' when yearlingPriceIndex is low and studFeeTrend negative", () => {
    const trend: EconomicTrend = {
      studFeeTrend: -0.1,
      yearlingPriceIndex: 80,
      claimingMarketActivity: 0,
    };
    const signal = getEconomicSignal(trend);
    expect(signal).toBe("bear");
  });

  it("returns 'stable' when trends are neutral", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0,
      yearlingPriceIndex: 100,
      claimingMarketActivity: 0,
    };
    const signal = getEconomicSignal(trend);
    expect(signal).toBe("stable");
  });
});

describe("processEconomicCycle", () => {
  it("sets globalEconomicState on manager", () => {
    const manager = createMockManager();
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [createMockStable({ id: "s1" })],
      day: 100,
    } as unknown as GameState;
    const result = processEconomicCycle(manager, mockState, 100);
    expect(result.globalEconomicState).toBeDefined();
    expect(typeof result.globalEconomicState?.yearlingPriceIndex).toBe("number");
  });

  it("updates existing globalEconomicState", () => {
    const manager = createMockManager();
    manager.globalEconomicState = {
      studFeeTrend: 0.05,
      yearlingPriceIndex: 105,
      claimingMarketActivity: 3,
    };
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [createMockStable({ id: "s1", cash: 300000 })],
      day: 100,
    } as unknown as GameState;
    const result = processEconomicCycle(manager, mockState, 100);
    expect(result.globalEconomicState).toBeDefined();
    // Should have evolved from the previous state
    expect(result.globalEconomicState).not.toEqual(manager.globalEconomicState);
  });
});

describe("trackClaimingActivity", () => {
  it("increases claiming market activity when claims occur", () => {
    const manager = createMockManager();
    manager.globalEconomicState = createEconomicState();
    const result = trackClaimingActivity(manager, 3);
    expect(result.globalEconomicState!.claimingMarketActivity).toBeGreaterThan(0);
  });

  it("does nothing when claimCount is zero", () => {
    const manager = createMockManager();
    manager.globalEconomicState = createEconomicState();
    const result = trackClaimingActivity(manager, 0);
    expect(result.globalEconomicState!.claimingMarketActivity).toBe(0);
  });

  it("caps claiming activity at 1.0", () => {
    const manager = createMockManager();
    manager.globalEconomicState = {
      ...createEconomicState(),
      claimingMarketActivity: 0.9,
    };
    const result = trackClaimingActivity(manager, 5);
    expect(result.globalEconomicState!.claimingMarketActivity).toBeLessThanOrEqual(1);
  });
});
