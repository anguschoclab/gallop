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
  trackAuctionPrices,
  evaluateCartelOpportunity,
  coordinateCartelAction,
  calculateAuctionReservePrice,
  calculateStrategicClaimingPrice,
  calculateDynamicStudFee,
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

function createMockManager(stableIds: string[] = ["s1", "s2"]): NpcAIManager {
  const stableStates: Record<string, StableAIState> = {};
  for (const id of stableIds) {
    stableStates[id] = createMockAIState(id);
  }
  return {
    stableStates,
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

describe("trackAuctionPrices", () => {
  it("does nothing when no auction results", () => {
    const manager = createMockManager();
    manager.globalEconomicState = createEconomicState();
    const result = trackAuctionPrices(manager, []);
    expect(result).toBe(manager);
  });

  it("adjusts stud fee trend based on high auction prices", () => {
    const manager = createMockManager();
    manager.globalEconomicState = createEconomicState();
    const result = trackAuctionPrices(manager, [
      { hammerPrice: 500000, horseRating: 80 },
      { hammerPrice: 600000, horseRating: 75 },
    ]);
    expect(result.globalEconomicState!.studFeeTrend).not.toBe(0);
  });

  it("adjusts stud fee trend downward for low auction prices", () => {
    const manager = createMockManager();
    manager.globalEconomicState = createEconomicState();
    const result = trackAuctionPrices(manager, [
      { hammerPrice: 1000, horseRating: 80 },
      { hammerPrice: 2000, horseRating: 75 },
    ]);
    expect(result.globalEconomicState!.studFeeTrend).toBeLessThan(0);
  });
});

describe("evaluateCartelOpportunity", () => {
  it("returns null when no relationships exist", () => {
    const manager = createMockManager(["s1", "s2"]);
    const result = evaluateCartelOpportunity(manager, "s1", ["s2"]);
    expect(result).toBeNull();
  });

  it("returns null when trust is too low", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 30, allianceType: null, history: [] },
    };
    const result = evaluateCartelOpportunity(manager, "s1", ["s2"]);
    expect(result).toBeNull();
  });

  it("returns cartel info when trust is high enough", () => {
    const manager = createMockManager(["s1", "s2", "s3"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 70, allianceType: null, history: [] },
      s3: { trust: 80, allianceType: null, history: [] },
    };
    const result = evaluateCartelOpportunity(manager, "s1", ["s2", "s3"]);
    expect(result).not.toBeNull();
    expect(result!.memberIds).toContain("s1");
    expect(result!.memberIds).toContain("s2");
    expect(result!.memberIds).toContain("s3");
  });

  it("returns breeding type for breeder personality", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 70, allianceType: null, history: [] },
    };
    (manager.stableStates["s1"].personalityState as { personality: string }).personality =
      "breeder";
    const result = evaluateCartelOpportunity(manager, "s1", ["s2"]);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("breeding");
  });
});

describe("coordinateCartelAction", () => {
  it("assigns directives to all members", () => {
    const directives = coordinateCartelAction(["s1", "s2", "s3"], "avoid_bidding_war", 100);
    expect(directives["s1"].action).toBe("avoid_bidding_war");
    expect(directives["s2"].action).toBe("avoid_bidding_war");
    expect(directives["s3"].action).toBe("avoid_bidding_war");
    expect(directives["s1"].day).toBe(100);
  });

  it("assigns rotation indices for rotate_claims action", () => {
    const directives = coordinateCartelAction(["s1", "s2", "s3"], "rotate_claims", 50);
    expect(directives["s1"].rotationIndex).toBe(0);
    expect(directives["s2"].rotationIndex).toBe(1);
    expect(directives["s3"].rotationIndex).toBe(2);
  });

  it("does not assign rotation indices for non-rotation actions", () => {
    const directives = coordinateCartelAction(["s1", "s2"], "fix_stud_fees", 50);
    expect(directives["s1"].rotationIndex).toBeUndefined();
    expect(directives["s2"].rotationIndex).toBeUndefined();
  });
});

describe("calculateAuctionReservePrice", () => {
  it("returns base price in neutral market", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0,
      yearlingPriceIndex: 100,
      claimingMarketActivity: 0,
    };
    const result = calculateAuctionReservePrice(trend, 50000);
    expect(result).toBe(50000);
  });

  it("increases reserve in bull market", () => {
    const trend: EconomicTrend = {
      studFeeTrend: 0.1,
      yearlingPriceIndex: 120,
      claimingMarketActivity: 0,
    };
    const result = calculateAuctionReservePrice(trend, 50000);
    expect(result).toBeGreaterThan(50000);
  });

  it("decreases reserve in bear market", () => {
    const trend: EconomicTrend = {
      studFeeTrend: -0.1,
      yearlingPriceIndex: 80,
      claimingMarketActivity: 0,
    };
    const result = calculateAuctionReservePrice(trend, 50000);
    expect(result).toBeLessThan(50000);
  });
});

describe("calculateStrategicClaimingPrice", () => {
  const trend: EconomicTrend = {
    studFeeTrend: 0,
    yearlingPriceIndex: 100,
    claimingMarketActivity: 0.5,
  };

  it("returns lower price when stable wants to sell", () => {
    const sellPrice = calculateStrategicClaimingPrice(trend, 70, true);
    const keepPrice = calculateStrategicClaimingPrice(trend, 70, false);
    expect(sellPrice).toBeLessThan(keepPrice);
  });

  it("returns higher price when stable wants to keep", () => {
    const keepPrice = calculateStrategicClaimingPrice(trend, 70, false);
    expect(keepPrice).toBeGreaterThan(70 * 1000);
  });
});

describe("calculateDynamicStudFee", () => {
  const trend: EconomicTrend = {
    studFeeTrend: 0.05,
    yearlingPriceIndex: 110,
    claimingMarketActivity: 0,
  };

  it("applies cartel premium when cartelFixed is true", () => {
    const result = calculateDynamicStudFee(trend, 50000, 0.5, true);
    expect(result).toBe(60000); // 50000 * 1.2
  });

  it("adjusts based on progeny performance", () => {
    const lowPerf = calculateDynamicStudFee(trend, 50000, 0.1, false);
    const highPerf = calculateDynamicStudFee(trend, 50000, 0.9, false);
    expect(highPerf).toBeGreaterThan(lowPerf);
  });

  it("applies market adjustment when not cartel-fixed", () => {
    const result = calculateDynamicStudFee(trend, 50000, 0.5, false);
    const marketAdj = calculateStudFeeAdjustment(trend, 50000);
    const expectedMultiplier = 0.7 + 0.5 * 0.6;
    expect(result).toBe(Math.round(marketAdj * expectedMultiplier));
  });
});
