import { describe, it, expect } from "vitest";
import { identifyCostOptimizationOpportunities, assessEmergencyBudget } from "@/core/ai/upkeepAI";
import { analyzeRosterGaps } from "@/core/ai/horseGenAI";
import {
  shouldWithdrawForTrackCondition,
  detectConsecutiveWithdrawalPattern,
} from "@/core/ai/withdrawalAI";
import { shouldConsiderGeldingForPerformance, generatePostGeldingPlan } from "@/core/ai/geldingAI";
import {
  calculateShareValue,
  shouldDissolveSyndicate,
  createSyndicationAIState,
  recordSyndicationOutcome,
  getSyndicationSuccessRate,
  shouldCreateSyndicateWithLearning,
} from "@/core/ai/syndicationAI";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { Horse, Stable } from "@/game/types";

describe("identifyCostOptimizationOpportunities", () => {
  it("returns empty array for healthy roster", () => {
    const horses = [createTestHorse({ id: "h1", age: 4, energy: 80, form: 60 })];
    expect(identifyCostOptimizationOpportunities(horses, 100)).toEqual([]);
  });

  it("flags old horses with low form", () => {
    const horses = [createTestHorse({ id: "h1", age: 11, form: 30 })];
    const result = identifyCostOptimizationOpportunities(horses, 100);
    expect(result.length).toBe(1);
    expect(result[0].reason).toBe("old_low_form");
  });
});

describe("assessEmergencyBudget", () => {
  it("declares emergency when less than 14 days of cash", () => {
    const result = assessEmergencyBudget(1000, 100, 5);
    expect(result.isEmergency).toBe(true);
  });

  it("recommends actions when less than 30 days of cash", () => {
    const result = assessEmergencyBudget(2000, 100, 15);
    expect(result.isEmergency).toBe(true);
    expect(result.recommendedActions).toContain("reduce_training");
    expect(result.horsesToSell).toBeGreaterThan(0);
  });

  it("returns healthy when more than 60 days of cash", () => {
    const result = assessEmergencyBudget(100000, 100, 5);
    expect(result.isEmergency).toBe(false);
    expect(result.recommendedActions).toEqual([]);
  });
});

describe("analyzeRosterGaps", () => {
  it("returns balanced for empty roster", () => {
    expect(analyzeRosterGaps([])).toEqual({ type: "balanced", reason: "empty_roster" });
  });

  it("returns balanced for well-rounded roster", () => {
    const horses = [
      createTestHorse({
        id: "h1",
        age: 3,
        distanceAptitude: 0.5,
        surfaceAptitude: { Turf: 0.7, Dirt: 0.7, Synthetic: 0.7 },
      }),
      createTestHorse({
        id: "h2",
        age: 3,
        distanceAptitude: 0.3,
        surfaceAptitude: { Turf: 0.7, Dirt: 0.7, Synthetic: 0.7 },
      }),
      createTestHorse({
        id: "h3",
        age: 4,
        distanceAptitude: 0.8,
        surfaceAptitude: { Turf: 0.7, Dirt: 0.7, Synthetic: 0.7 },
      }),
    ];
    const result = analyzeRosterGaps(horses);
    expect(result.type).toBe("balanced");
  });
});

describe("shouldWithdrawForTrackCondition", () => {
  it("does not withdraw on fast track", () => {
    const horse = createTestHorse({ id: "h1", mudAptitude: 0.1 });
    expect(shouldWithdrawForTrackCondition(horse, "fast")).toBe(false);
  });

  it("withdraws on muddy track for horse with low mud aptitude", () => {
    const horse = createTestHorse({ id: "h1", mudAptitude: 0.2 });
    expect(shouldWithdrawForTrackCondition(horse, "muddy")).toBe(true);
  });

  it("does not withdraw on sloppy track for horse with good mud aptitude", () => {
    const horse = createTestHorse({ id: "h1", mudAptitude: 0.5 });
    expect(shouldWithdrawForTrackCondition(horse, "sloppy")).toBe(false);
  });
});

describe("detectConsecutiveWithdrawalPattern", () => {
  it("returns false for less than 3 entries", () => {
    expect(detectConsecutiveWithdrawalPattern([{ withdrew: true }, { withdrew: true }])).toBe(
      false,
    );
  });

  it("returns true for 3 consecutive withdrawals", () => {
    expect(
      detectConsecutiveWithdrawalPattern([
        { withdrew: true },
        { withdrew: true },
        { withdrew: true },
      ]),
    ).toBe(true);
  });

  it("returns false when not all recent are withdrawals", () => {
    expect(
      detectConsecutiveWithdrawalPattern([
        { withdrew: false },
        { withdrew: true },
        { withdrew: true },
      ]),
    ).toBe(false);
  });
});

describe("shouldConsiderGeldingForPerformance", () => {
  it("returns false for horse with insufficient race history", () => {
    const horse = createTestHorse({ id: "h1", raceHistory: [] });
    expect(shouldConsiderGeldingForPerformance(horse)).toBe(false);
  });

  it("returns true for inconsistent performer with poor average", () => {
    const horse = createTestHorse({
      id: "h1",
      raceHistory: [
        { raceId: "r1", raceName: "R1", position: 1, day: 1 },
        { raceId: "r2", raceName: "R2", position: 10, day: 2 },
        { raceId: "r3", raceName: "R3", position: 2, day: 3 },
        { raceId: "r4", raceName: "R4", position: 9, day: 4 },
        { raceId: "r5", raceName: "R5", position: 8, day: 5 },
      ],
    });
    expect(shouldConsiderGeldingForPerformance(horse)).toBe(true);
  });
});

describe("generatePostGeldingPlan", () => {
  it("provides shorter rest for younger horses", () => {
    const young = createTestHorse({ id: "h1", age: 3 });
    const old = createTestHorse({ id: "h2", age: 5 });
    const youngPlan = generatePostGeldingPlan(young, 100);
    const oldPlan = generatePostGeldingPlan(old, 100);
    expect(youngPlan.restDays).toBeLessThan(oldPlan.restDays);
  });

  it("schedules reintroduction after rest period", () => {
    const horse = createTestHorse({ id: "h1", age: 4 });
    const plan = generatePostGeldingPlan(horse, 100);
    expect(plan.reintroductionDay).toBe(100 + plan.restDays);
    expect(plan.targetRaceDay).toBe(plan.reintroductionDay + 14);
  });
});

describe("calculateShareValue", () => {
  it("returns 0 for 0 total shares", () => {
    const horse = createTestHorse({ id: "h1" });
    expect(calculateShareValue(horse, 0)).toBe(0);
  });

  it("returns positive value for a stallion with shares", () => {
    const horse = createTestHorse({
      id: "h1",
      raceHistory: [{ raceId: "r1", raceName: "G1", position: 1, day: 1, grade: "G1" }],
      lifetimeEarnings: 5000000,
    });
    const value = calculateShareValue(horse, 10);
    expect(value).toBeGreaterThan(0);
  });
});

describe("shouldDissolveSyndicate", () => {
  it("does not dissolve young syndicates", () => {
    const horse = createTestHorse({ id: "h1", age: 5 });
    expect(shouldDissolveSyndicate(horse, 1000000, 2)).toBe(false);
  });

  it("dissolves old stallion syndicates with low value", () => {
    const horse = createTestHorse({ id: "h1", age: 20 });
    expect(shouldDissolveSyndicate(horse, 300000, 5)).toBe(true);
  });

  it("dissolves long-running syndicates with no G1 wins and low value", () => {
    const horse = createTestHorse({ id: "h1", age: 10, raceHistory: [] });
    expect(shouldDissolveSyndicate(horse, 500000, 6)).toBe(true);
  });

  it("does not dissolve successful syndicates", () => {
    const horse = createTestHorse({
      id: "h1",
      age: 8,
      raceHistory: [{ raceId: "r1", raceName: "G1", position: 1, day: 1, grade: "G1" }],
    });
    expect(shouldDissolveSyndicate(horse, 5000000, 5)).toBe(false);
  });
});

describe("createSyndicationAIState", () => {
  it("creates state with personality and learning", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    const state = createSyndicationAIState(stable);
    expect(state.personalityState).toBeDefined();
    expect(state.learningState).toBeDefined();
    expect(state.syndicationHistory).toEqual([]);
  });
});

describe("recordSyndicationOutcome", () => {
  it("records decision in history", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    let state = createSyndicationAIState(stable);
    state = recordSyndicationOutcome(
      state,
      {
        stallionId: "h1",
        stableId: "s1",
        action: "create",
        shares: 0,
        value: 500000,
        day: 100,
        success: true,
      },
      100,
    );
    expect(state.syndicationHistory).toHaveLength(1);
    expect(state.syndicationHistory[0].action).toBe("create");
  });

  it("trims history to memory depth", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    let state = createSyndicationAIState(stable);
    for (let i = 0; i < 30; i++) {
      state = recordSyndicationOutcome(
        state,
        {
          stallionId: `h${i}`,
          stableId: "s1",
          action: "buy",
          shares: 1,
          value: 50000,
          day: 100 + i,
          success: true,
        },
        100 + i,
      );
    }
    expect(state.syndicationHistory.length).toBeLessThanOrEqual(state.personalityState.memoryDepth);
  });

  it("does not mutate original state", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    const state = createSyndicationAIState(stable);
    const originalLength = state.syndicationHistory.length;
    recordSyndicationOutcome(
      state,
      {
        stallionId: "h1",
        stableId: "s1",
        action: "create",
        shares: 0,
        value: 500000,
        day: 100,
        success: true,
      },
      100,
    );
    expect(state.syndicationHistory).toHaveLength(originalLength);
  });
});

describe("getSyndicationSuccessRate", () => {
  it("returns 0.5 for empty history (default)", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    const state = createSyndicationAIState(stable);
    expect(getSyndicationSuccessRate(state, "create")).toBe(0.5);
  });

  it("returns 1.0 after successful outcomes", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    let state = createSyndicationAIState(stable);
    for (let i = 0; i < 5; i++) {
      state = recordSyndicationOutcome(
        state,
        {
          stallionId: `h${i}`,
          stableId: "s1",
          action: "buy",
          shares: 1,
          value: 50000,
          day: 100 + i,
          success: true,
        },
        100 + i,
      );
    }
    expect(getSyndicationSuccessRate(state, "buy")).toBe(1.0);
  });
});

describe("shouldCreateSyndicateWithLearning", () => {
  it("returns true when base decision is true and no history", () => {
    const stable = createTestStable({
      id: "s1",
      personality: "aggressive",
      cash: 500000,
    });
    const horse = createTestHorse({
      id: "h1",
      stableId: "s1",
      stud: {
        atStud: true,
        standingFee: 50000,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        bookSize: 0,
        seasonBookings: 0,
        lifetimeFoals: 0,
      },
      raceHistory: [{ raceId: "r1", raceName: "G1", position: 1, day: 1, grade: "G1" }],
    });
    const aiState = createSyndicationAIState(stable);
    expect(shouldCreateSyndicateWithLearning(aiState, stable, horse, {})).toBe(true);
  });

  it("returns false when past syndication success is low", () => {
    const stable = createTestStable({
      id: "s1",
      personality: "aggressive",
      cash: 500000,
    });
    const horse = createTestHorse({
      id: "h1",
      stableId: "s1",
      stud: {
        atStud: true,
        standingFee: 50000,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        bookSize: 0,
        seasonBookings: 0,
        lifetimeFoals: 0,
      },
      raceHistory: [{ raceId: "r1", raceName: "G1", position: 1, day: 1, grade: "G1" }],
    });
    let aiState = createSyndicationAIState(stable);
    // Record 5 failed syndication outcomes
    for (let i = 0; i < 5; i++) {
      aiState = recordSyndicationOutcome(
        aiState,
        {
          stallionId: `h${i}`,
          stableId: "s1",
          action: "create",
          shares: 0,
          value: 100000,
          day: 100 + i,
          success: false,
        },
        100 + i,
      );
    }
    expect(shouldCreateSyndicateWithLearning(aiState, stable, horse, {})).toBe(false);
  });
});
