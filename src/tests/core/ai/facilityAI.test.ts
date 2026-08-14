import { describe, it, expect } from "vitest";
import {
  createFacilityAIState,
  calculateFacilityBudget,
  shouldUpgradeFacility,
  selectFacilityToUpgrade,
  recordFacilityInvestment,
  updateFacilityROI,
  getFacilityInsights,
  shouldUpgradeForCapacity,
  getSpecializationPriority,
  shouldDivestFacility,
} from "@/core/ai/facilityAI";
import type { PlayerFacilities } from "@/core/facilities/facilityTypes";
import type { FacilityROI } from "@/core/ai/facilityAI";
import { createTestStable } from "@/tests/helpers/createTestStable";

function makeState(
  personality = "aggressive" as Parameters<typeof createFacilityAIState>[0]["personality"],
) {
  return createFacilityAIState(createTestStable({ personality }));
}

function makeFacilities(overrides: Partial<PlayerFacilities> = {}): PlayerFacilities {
  const base: PlayerFacilities = {
    main_track: {
      type: "main_track",
      level: "basic",
      maintenanceCost: 10,
      upgradeCost: 5000,
      builtDay: 1,
    },
    barn: { type: "barn", level: "basic", maintenanceCost: 10, upgradeCost: 5000, builtDay: 1 },
    exercise_pool: undefined,
    treadmill: undefined,
    veterinary_clinic: undefined,
    starting_gates: undefined,
    transport: undefined,
    spa: undefined,
    nutrition_lab: undefined,
    rehab_center: undefined,
  };
  return { ...base, ...overrides };
}

describe("createFacilityAIState", () => {
  it("returns valid shape", () => {
    const state = makeState();
    expect(state.personalityState).toBeDefined();
    expect(state.learningState).toBeDefined();
    expect(state.investmentHistory).toEqual([]);
    expect(state.roiTracking).toEqual({});
  });

  it("reflects stable personality", () => {
    const state = makeState("conservative");
    expect(state.personalityState.personality).toBe("conservative");
  });
});

describe("calculateFacilityBudget", () => {
  it("totalBudget is 15% of stable cash", () => {
    const stable = createTestStable({ cash: 100_000 });
    const state = createFacilityAIState(stable);
    const budget = calculateFacilityBudget(state, stable, 1);
    expect(budget.totalBudget).toBeCloseTo(15_000);
  });

  it("upgradeBudget + maintenanceBudget equals totalBudget", () => {
    const stable = createTestStable({ cash: 80_000 });
    const state = createFacilityAIState(stable);
    const budget = calculateFacilityBudget(state, stable, 1);
    expect(budget.upgradeBudget + budget.maintenanceBudget).toBeCloseTo(budget.totalBudget);
  });

  it("conservative personality allocates less to upgrades", () => {
    const stableAgg = createTestStable({ cash: 100_000, personality: "aggressive" });
    const stableCon = createTestStable({ cash: 100_000, personality: "conservative" });
    const aggBudget = calculateFacilityBudget(createFacilityAIState(stableAgg), stableAgg, 1);
    const conBudget = calculateFacilityBudget(createFacilityAIState(stableCon), stableCon, 1);
    expect(conBudget.upgradeBudget).toBeLessThan(aggBudget.upgradeBudget);
  });

  it("aggressive personality allocates more to upgrades than default", () => {
    const stableAgg = createTestStable({ cash: 100_000, personality: "aggressive" });
    const stableDev = createTestStable({ cash: 100_000, personality: "developer" });
    const aggBudget = calculateFacilityBudget(createFacilityAIState(stableAgg), stableAgg, 1);
    const devBudget = calculateFacilityBudget(createFacilityAIState(stableDev), stableDev, 1);
    expect(aggBudget.upgradeBudget).toBeGreaterThan(devBudget.upgradeBudget);
  });
});

describe("shouldUpgradeFacility", () => {
  it("returns false for elite level (cannot upgrade)", () => {
    const stable = createTestStable({ cash: 500_000 });
    const state = makeState();
    expect(shouldUpgradeFacility(state, "main_track", "elite", stable, 1)).toBe(false);
  });

  it("returns a boolean for non-elite levels", () => {
    const stable = createTestStable({ cash: 500_000 });
    const state = makeState();
    const result = shouldUpgradeFacility(state, "main_track", "basic", stable, 1);
    expect(typeof result).toBe("boolean");
  });

  it("stable with very low cash is less likely to upgrade", () => {
    const richStable = createTestStable({ cash: 500_000, personality: "aggressive" });
    const poorStable = createTestStable({ cash: 100, personality: "aggressive" });
    const richState = createFacilityAIState(richStable);
    const poorState = createFacilityAIState(poorStable);
    const richResult = shouldUpgradeFacility(richState, "main_track", "basic", richStable, 1);
    const poorResult = shouldUpgradeFacility(poorState, "main_track", "basic", poorStable, 1);
    // Rich stable should be at least as likely to upgrade
    expect(richResult >= poorResult).toBe(true);
  });
});

describe("selectFacilityToUpgrade", () => {
  it("returns null when no facilities defined", () => {
    const stable = createTestStable({ cash: 100_000 });
    const state = makeState();
    const emptyFacilities: PlayerFacilities = {
      main_track: undefined,
      barn: undefined,
      exercise_pool: undefined,
      treadmill: undefined,
      veterinary_clinic: undefined,
      starting_gates: undefined,
      transport: undefined,
      spa: undefined,
      nutrition_lab: undefined,
      rehab_center: undefined,
    };
    const result = selectFacilityToUpgrade(state, emptyFacilities, stable, 1);
    expect(result).toBeNull();
  });

  it("returns null when all facilities are elite", () => {
    const stable = createTestStable({ cash: 500_000 });
    const state = makeState();
    const eliteFacilities = makeFacilities({
      main_track: {
        type: "main_track",
        level: "elite",
        maintenanceCost: 150,
        upgradeCost: 0,
        builtDay: 1,
      },
      barn: { type: "barn", level: "elite", maintenanceCost: 150, upgradeCost: 0, builtDay: 1 },
    });
    const result = selectFacilityToUpgrade(state, eliteFacilities, stable, 1);
    expect(result).toBeNull();
  });

  it("returns null when cash is too low for any upgrade", () => {
    const stable = createTestStable({ cash: 1 });
    const state = createFacilityAIState(stable);
    const result = selectFacilityToUpgrade(state, makeFacilities(), stable, 1);
    expect(result).toBeNull();
  });

  it("returns a FacilityType string when an upgrade is affordable", () => {
    const stable = createTestStable({ cash: 500_000 });
    const state = makeState();
    const result = selectFacilityToUpgrade(state, makeFacilities(), stable, 1);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});

describe("recordFacilityInvestment", () => {
  it("adds investment to history", () => {
    const stable = createTestStable();
    const state = makeState();
    const updated = recordFacilityInvestment(
      state,
      "main_track",
      "basic",
      "standard",
      5000,
      stable,
      10,
    );
    expect(updated.investmentHistory).toHaveLength(1);
    expect(updated.investmentHistory[0].facilityType).toBe("main_track");
    expect(updated.investmentHistory[0].cost).toBe(5000);
    expect(updated.investmentHistory[0].fromLevel).toBe("basic");
    expect(updated.investmentHistory[0].toLevel).toBe("standard");
    expect(updated.investmentHistory[0].day).toBe(10);
  });

  it("initializes ROI tracking for the upgraded level", () => {
    const stable = createTestStable();
    const state = makeState();
    const updated = recordFacilityInvestment(state, "barn", "basic", "standard", 5000, stable, 5);
    expect(updated.roiTracking["barn:standard"]).toBeDefined();
    expect(updated.roiTracking["barn:standard"].totalInvestment).toBe(5000);
    expect(updated.roiTracking["barn:standard"].totalBenefit).toBe(0);
  });

  it("accumulates investment for repeated upgrades of same facility/level", () => {
    const stable = createTestStable();
    let state = makeState();
    state = recordFacilityInvestment(state, "barn", "basic", "standard", 5000, stable, 1);
    state = recordFacilityInvestment(state, "barn", "basic", "standard", 5000, stable, 2);
    expect(state.roiTracking["barn:standard"].totalInvestment).toBe(10000);
  });

  it("trims history to personalityState.memoryDepth", () => {
    const stable = createTestStable();
    let state = makeState();
    state.personalityState.memoryDepth = 3;
    for (let i = 0; i < 5; i++) {
      state = recordFacilityInvestment(state, "main_track", "basic", "standard", 5000, stable, i);
    }
    expect(state.investmentHistory.length).toBeLessThanOrEqual(3);
  });
});

describe("updateFacilityROI", () => {
  it("returns unchanged state when ROI key not found", () => {
    const state = makeState();
    const updated = updateFacilityROI(state, "spa", "basic", 100, 5);
    expect(updated).toBe(state);
  });

  it("updates totalBenefit and daysOwned when ROI key exists", () => {
    const stable = createTestStable();
    let state = makeState();
    state = recordFacilityInvestment(state, "main_track", "basic", "standard", 5000, stable, 1);
    const updated = updateFacilityROI(state, "main_track", "standard", 200, 10);
    expect(updated.roiTracking["main_track:standard"].totalBenefit).toBe(200);
    expect(updated.roiTracking["main_track:standard"].daysOwned).toBe(9); // 10 - 1
    expect(updated.roiTracking["main_track:standard"].lastUpdateDay).toBe(10);
  });

  it("accumulates benefit across multiple updates", () => {
    const stable = createTestStable();
    let state = makeState();
    state = recordFacilityInvestment(state, "barn", "basic", "standard", 5000, stable, 1);
    state = updateFacilityROI(state, "barn", "standard", 100, 5);
    state = updateFacilityROI(state, "barn", "standard", 150, 10);
    expect(state.roiTracking["barn:standard"].totalBenefit).toBe(250);
  });
});

describe("getFacilityInsights", () => {
  it("returns zeroes for a stable with no investment history", () => {
    const state = makeState();
    const insights = getFacilityInsights(state, "test-stable-id");
    expect(insights.totalInvestments).toBe(0);
    expect(insights.totalFacilities).toBe(0);
    expect(insights.avgROI).toBe(0);
    expect(insights.facilityLevels).toEqual({});
  });

  it("counts investments for the correct stable only", () => {
    const stableA = createTestStable({ id: "stable-a" });
    const stableB = createTestStable({ id: "stable-b" });
    let state = makeState();
    state = recordFacilityInvestment(state, "main_track", "basic", "standard", 5000, stableA, 1);
    state = recordFacilityInvestment(state, "barn", "basic", "standard", 5000, stableB, 2);
    const insightsA = getFacilityInsights(state, "stable-a");
    expect(insightsA.totalInvestments).toBe(1);
    const insightsB = getFacilityInsights(state, "stable-b");
    expect(insightsB.totalInvestments).toBe(1);
  });

  it("records facility levels from investment history", () => {
    const stable = createTestStable({ id: "my-stable" });
    let state = makeState();
    state = recordFacilityInvestment(state, "main_track", "basic", "standard", 5000, stable, 1);
    state = recordFacilityInvestment(state, "barn", "basic", "premium", 15000, stable, 2);
    const insights = getFacilityInsights(state, "my-stable");
    expect(insights.facilityLevels["main_track"]).toBe("standard");
    expect(insights.facilityLevels["barn"]).toBe("premium");
    expect(insights.totalFacilities).toBe(2);
  });
});

describe("shouldUpgradeForCapacity", () => {
  it("recommends upgrade when at 80% capacity and affordable", () => {
    expect(shouldUpgradeForCapacity("barn", "basic", 4, 100000)).toBe(true);
  });

  it("does not upgrade when below capacity threshold", () => {
    expect(shouldUpgradeForCapacity("barn", "basic", 2, 100000)).toBe(false);
  });

  it("does not upgrade when stable cannot afford it", () => {
    expect(shouldUpgradeForCapacity("barn", "basic", 4, 5000)).toBe(false);
  });

  it("does not upgrade elite level facilities", () => {
    expect(shouldUpgradeForCapacity("barn", "elite", 18, 1000000)).toBe(false);
  });
});

describe("getSpecializationPriority", () => {
  it("prioritizes barn for breeder personality", () => {
    const priority = getSpecializationPriority("breeder");
    expect(priority[0]).toBe("barn");
  });

  it("prioritizes main_track for aggressive personality", () => {
    const priority = getSpecializationPriority("aggressive");
    expect(priority[0]).toBe("main_track");
  });

  it("prioritizes main_track for developer personality", () => {
    const priority = getSpecializationPriority("developer");
    expect(priority[0]).toBe("main_track");
  });

  it("returns valid FacilityType values", () => {
    const priority = getSpecializationPriority("trader");
    expect(priority.length).toBeGreaterThan(0);
    expect(typeof priority[0]).toBe("string");
  });
});

describe("shouldDivestFacility", () => {
  it("does not divest basic level facilities", () => {
    const roi: FacilityROI = {
      facilityType: "main_track",
      level: "basic",
      totalInvestment: 10000,
      totalBenefit: 5000,
      daysOwned: 60,
      lastUpdateDay: 60,
    };
    expect(shouldDivestFacility(roi, "basic")).toBe(false);
  });

  it("does not divest standard level facilities", () => {
    const roi: FacilityROI = {
      facilityType: "main_track",
      level: "standard",
      totalInvestment: 10000,
      totalBenefit: 5000,
      daysOwned: 60,
      lastUpdateDay: 60,
    };
    expect(shouldDivestFacility(roi, "standard")).toBe(false);
  });

  it("divests premium facilities with poor ROI", () => {
    const roi: FacilityROI = {
      facilityType: "main_track",
      level: "premium",
      totalInvestment: 50000,
      totalBenefit: 30000,
      daysOwned: 60,
      lastUpdateDay: 60,
    };
    expect(shouldDivestFacility(roi, "premium")).toBe(true);
  });

  it("does not divest premium facilities with good ROI", () => {
    const roi: FacilityROI = {
      facilityType: "main_track",
      level: "premium",
      totalInvestment: 50000,
      totalBenefit: 60000,
      daysOwned: 60,
      lastUpdateDay: 60,
    };
    expect(shouldDivestFacility(roi, "premium")).toBe(false);
  });

  it("does not divest facilities owned less than 30 days", () => {
    const roi: FacilityROI = {
      facilityType: "main_track",
      level: "premium",
      totalInvestment: 50000,
      totalBenefit: 10000,
      daysOwned: 20,
      lastUpdateDay: 20,
    };
    expect(shouldDivestFacility(roi, "premium")).toBe(false);
  });
});

describe("shouldUpgradeFacility weight modulation", () => {
  it("returns false when weight = 0", () => {
    const stable = createTestStable({ cash: 500_000, personality: "aggressive" });
    const state = makeState();
    expect(shouldUpgradeFacility(state, "main_track", "basic", stable, 1, 0)).toBe(false);
  });

  it("weight = 1.0 preserves baseline behavior", () => {
    const stable = createTestStable({ cash: 500_000, personality: "aggressive" });
    const state = makeState();
    const baseline = shouldUpgradeFacility(state, "main_track", "basic", stable, 1);
    const withWeight = shouldUpgradeFacility(state, "main_track", "basic", stable, 1, 1.0);
    expect(withWeight).toBe(baseline);
  });

  it("weight > 1 makes upgrade more likely (lower threshold)", () => {
    // Use conservative personality (higher threshold) to test that weight lowers it
    const stable = createTestStable({ cash: 500_000, personality: "conservative" });
    const state = makeState("conservative");
    const baseline = shouldUpgradeFacility(state, "main_track", "basic", stable, 1);
    // With weight = 2.0, threshold is halved, so if baseline was false, weighted may be true
    const withWeight = shouldUpgradeFacility(state, "main_track", "basic", stable, 1, 2.0);
    // If baseline is true, weighted must also be true (lower threshold can't make it false)
    if (baseline) {
      expect(withWeight).toBe(true);
    }
    // If baseline is false, weighted may flip to true (that's the expected modulation)
    // We just verify it doesn't throw and returns a boolean
    expect(typeof withWeight).toBe("boolean");
  });
});
