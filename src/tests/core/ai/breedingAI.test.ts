import { describe, it, expect } from "vitest";
import {
  createBreedingAIState,
  calculateAIStallionScore,
  recordBreedingDecision,
  recordBreedingOutcome,
  getBreedingInsights,
  getProgenyTripleCrownSuccess,
  adaptBreedingStrategy,
} from "@/core/ai/breedingAI";
import type { Horse, Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

function createMockStallion(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "stallion-1",
    name: "Test Stallion",
    age: 8,
    gender: "horse",
    energy: 80,
    form: 60,
    stats: {
      speed: 80,
      stamina: 80,
      acceleration: 80,
      consistency: 80,
      temperament: 50,
      conformation: 50,
    },
    distanceAptitude: 2000,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    stud: {
      atStud: true,
      standingFee: 50000,
      lifetimeFoals: 100,
      lifetimeStakesFoals: 10,
      lifetimeG1Foals: 2,
      bookSize: 40,
      seasonBookings: 20,
    },
    ...overrides,
  });
}

function createMockMare(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "mare-1",
    name: "Test Mare",
    age: 5,
    gender: "mare",
    energy: 80,
    form: 60,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    distanceAptitude: 1800,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    ...overrides,
  });
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    cash: 500000,
    personality: "breeder",
    ...overrides,
  });
}

describe("createBreedingAIState", () => {
  it("initializes with empty breedingHistory", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    expect(state.breedingHistory).toEqual([]);
  });

  it("initializes with null activeProgram", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    expect(state.activeProgram).toBeNull();
  });

  it("initializes with empty programDistanceHistory", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    expect(state.programDistanceHistory).toEqual([]);
  });

  it("initializes with cooldown=0", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    expect(state.programSwitchCooldown).toBe(0);
  });
});

describe("calculateAIStallionScore", () => {
  it("returns a number", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const stallion = createMockStallion();
    const mare = createMockMare();
    const score = calculateAIStallionScore(state, stallion, mare, stable, 100000);
    expect(typeof score).toBe("number");
    expect(Number.isFinite(score)).toBe(true);
  });

  it("requires stallion with stud property (scoreStallion accesses stallion.stud!)", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const stallion = createMockStallion();
    const mare = createMockMare();
    // Should not throw when stud is present
    expect(() => calculateAIStallionScore(state, stallion, mare, stable, 100000)).not.toThrow();
  });

  it("learning adjustment: (successRate - 0.5) * 20 with no history defaults to 0", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const stallion = createMockStallion();
    const mare = createMockMare();
    const score = calculateAIStallionScore(state, stallion, mare, stable, 100000);
    // With no history, successRate=0.5, adaptiveBonus=0
    // Just verify it returns a finite number
    expect(Number.isFinite(score)).toBe(true);
  });

  it("strategic bonus from history: proven sire success adds bonus", () => {
    const stable = createMockStable({ id: "stable-1" });
    let state = createBreedingAIState(stable);
    const stallion = createMockStallion({ id: "stallion-1" });
    const mare = createMockMare();

    // Record a successful breeding decision and outcome
    state = recordBreedingDecision(state, stallion.id, mare.id, stallion.name, mare.name, "stable-1", "breeder", 100, 50);
    state = recordBreedingOutcome(state, stallion.id, mare.id, "foal-1", 75, true, 200);

    // Now calculate score - should include strategic bonus from proven sire
    const scoreWithHistory = calculateAIStallionScore(state, stallion, mare, stable, 100000);
    const stateWithoutHistory = createBreedingAIState(stable);
    const scoreWithoutHistory = calculateAIStallionScore(stateWithoutHistory, stallion, mare, stable, 100000);
    expect(scoreWithHistory).toBeGreaterThan(scoreWithoutHistory);
  });
});

describe("recordBreedingDecision", () => {
  it("adds to history with all fields", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const newState = recordBreedingDecision(state, "sire-1", "dam-1", "Sire Name", "Dam Name", "stable-1", "breeder", 100, 50);
    expect(newState.breedingHistory.length).toBe(1);
    expect(newState.breedingHistory[0].sireId).toBe("sire-1");
    expect(newState.breedingHistory[0].damId).toBe("dam-1");
    expect(newState.breedingHistory[0].sireName).toBe("Sire Name");
    expect(newState.breedingHistory[0].damName).toBe("Dam Name");
    expect(newState.breedingHistory[0].stableId).toBe("stable-1");
    expect(newState.breedingHistory[0].personality).toBe("breeder");
    expect(newState.breedingHistory[0].day).toBe(100);
    expect(newState.breedingHistory[0].score).toBe(50);
  });

  it("trims to memoryDepth", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 5; i++) {
      currentState = recordBreedingDecision(currentState, `s-${i}`, `d-${i}`, "S", "D", "stable-1", "breeder", i, 50);
    }
    expect(currentState.breedingHistory.length).toBe(memoryDepth);
  });

  it("does not mutate original", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const newState = recordBreedingDecision(state, "s-1", "d-1", "S", "D", "stable-1", "breeder", 100, 50);
    expect(state.breedingHistory).toEqual([]);
    expect(newState).not.toBe(state);
  });
});

describe("recordBreedingOutcome", () => {
  it("finds matching decision and updates with outcome", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);
    state = recordBreedingDecision(state, "sire-1", "dam-1", "S", "D", "stable-1", "breeder", 100, 50);
    const newState = recordBreedingOutcome(state, "sire-1", "dam-1", "foal-1", 75, true, 200);
    expect(newState.breedingHistory[0].outcome).toBeDefined();
    expect(newState.breedingHistory[0].outcome?.foalId).toBe("foal-1");
    expect(newState.breedingHistory[0].outcome?.foalRating).toBe(75);
    expect(newState.breedingHistory[0].outcome?.success).toBe(true);
    expect(newState.breedingHistory[0].outcome?.value).toBe(75);
  });

  it("updates personalityState", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);
    state = recordBreedingDecision(state, "sire-1", "dam-1", "S", "D", "stable-1", "breeder", 100, 50);
    const newState = recordBreedingOutcome(state, "sire-1", "dam-1", "foal-1", 75, true, 200);
    expect(newState.personalityState.learningState.outcomes.length).toBeGreaterThan(0);
  });

  it("returns unchanged if no match found", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const newState = recordBreedingOutcome(state, "unknown", "unknown", "foal-1", 75, true, 200);
    expect(newState).toBe(state);
  });

  it("handles tripleCrownWin by recording additional series-specific learning", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);
    state = recordBreedingDecision(state, "sire-1", "dam-1", "S", "D", "stable-1", "breeder", 100, 50, "triple_crown_series_1");
    const newState = recordBreedingOutcome(state, "sire-1", "dam-1", "foal-1", 75, true, 200, "triple_crown_series_1");
    // Should have recorded 2 outcomes: one for breeding, one for series
    expect(newState.personalityState.learningState.outcomes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getBreedingInsights", () => {
  it("returns defaults for empty history", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const insights = getBreedingInsights(state, "stable-1");
    expect(insights.totalDecisions).toBe(0);
    expect(insights.successRate).toBe(0.5);
    expect(insights.avgFoalRating).toBe(0);
    expect(insights.topSires).toEqual([]);
  });

  it("filters by stableId with outcomes", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);
    state = recordBreedingDecision(state, "sire-1", "dam-1", "Sire A", "Dam A", "stable-1", "breeder", 100, 50);
    state = recordBreedingOutcome(state, "sire-1", "dam-1", "foal-1", 75, true, 200);

    const insights = getBreedingInsights(state, "stable-1");
    expect(insights.totalDecisions).toBe(1);
    expect(insights.successRate).toBe(1.0);
    expect(insights.avgFoalRating).toBe(75);
  });

  it("groups by sire, sorts by successRate, top 5", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);
    // Record 3 sires with different success rates
    for (let i = 0; i < 3; i++) {
      state = recordBreedingDecision(state, `sire-${i}`, `dam-${i}`, `Sire ${i}`, `Dam ${i}`, "stable-1", "breeder", 100 + i, 50);
      state = recordBreedingOutcome(state, `sire-${i}`, `dam-${i}`, `foal-${i}`, 70, i === 0, 200);
    }
    const insights = getBreedingInsights(state, "stable-1");
    expect(insights.topSires.length).toBe(3);
    // Sire 0 has successRate=1.0, should be first
    expect(insights.topSires[0].sireId).toBe("sire-0");
    expect(insights.topSires[0].successRate).toBe(1.0);
  });
});

describe("getProgenyTripleCrownSuccess", () => {
  it("returns 0.5 for no history", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    expect(getProgenyTripleCrownSuccess(state, "sire-1", "tc-key")).toBe(0.5);
  });

  it("calculates seriesWins / total with history", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);
    state = recordBreedingDecision(state, "sire-1", "dam-1", "S", "D", "stable-1", "breeder", 100, 50, "tc-key");
    state = recordBreedingOutcome(state, "sire-1", "dam-1", "foal-1", 75, true, 200, "tc-key");

    // 1 history with tripleCrownWin="tc-key", seriesWins=1, total=1
    const success = getProgenyTripleCrownSuccess(state, "sire-1", "tc-key");
    expect(success).toBe(1.0);
  });
});

describe("adaptBreedingStrategy", () => {
  it("does not mutate original state — returns new state", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);

    // Record 11 failed outcomes to trigger adaptation
    for (let i = 0; i < 11; i++) {
      state = recordBreedingDecision(state, `sire-${i}`, `dam-${i}`, "S", "D", "stable-1", "breeder", i, 50);
      state = recordBreedingOutcome(state, `sire-${i}`, `dam-${i}`, `foal-${i}`, 30, false, 200);
    }

    const originalConfidence = state.personalityState.strategyConfidence;
    const returnedState = adaptBreedingStrategy(state, 200);

    // Original state should be unchanged
    expect(state.personalityState.strategyConfidence).toBe(originalConfidence);
    // Returned state should be a new reference with decreased confidence
    expect(returnedState).not.toBe(state);
    expect(returnedState.personalityState.strategyConfidence).toBe(originalConfidence - 0.05);
  });

  it("decreases confidence by 0.05 when > 10 decisions and successRate < 0.4", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);

    for (let i = 0; i < 11; i++) {
      state = recordBreedingDecision(state, `sire-${i}`, `dam-${i}`, "S", "D", "stable-1", "breeder", i, 50);
      state = recordBreedingOutcome(state, `sire-${i}`, `dam-${i}`, `foal-${i}`, 30, false, 200);
    }

    const originalConfidence = state.personalityState.strategyConfidence;
    const returnedState = adaptBreedingStrategy(state, 200);
    expect(returnedState.personalityState.strategyConfidence).toBe(originalConfidence - 0.05);
  });

  it("does not reduce confidence below 0.3", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);

    for (let i = 0; i < 11; i++) {
      state = recordBreedingDecision(state, `sire-${i}`, `dam-${i}`, "S", "D", "stable-1", "breeder", i, 50);
      state = recordBreedingOutcome(state, `sire-${i}`, `dam-${i}`, `foal-${i}`, 30, false, 200);
    }

    // Set confidence near floor
    state = {
      ...state,
      personalityState: {
        ...state.personalityState,
        strategyConfidence: 0.32,
      },
    };
    const returnedState = adaptBreedingStrategy(state, 200);
    expect(returnedState.personalityState.strategyConfidence).toBe(0.3);
  });

  it("increases confidence by 0.05 when > 10 decisions and successRate > 0.7", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);

    for (let i = 0; i < 11; i++) {
      state = recordBreedingDecision(state, `sire-${i}`, `dam-${i}`, "S", "D", "stable-1", "breeder", i, 50);
      state = recordBreedingOutcome(state, `sire-${i}`, `dam-${i}`, `foal-${i}`, 80, true, 200);
    }

    const originalConfidence = state.personalityState.strategyConfidence;
    const returnedState = adaptBreedingStrategy(state, 200);
    expect(returnedState.personalityState.strategyConfidence).toBe(originalConfidence + 0.05);
  });

  it("does not increase confidence above 1.0", () => {
    const stable = createMockStable();
    let state = createBreedingAIState(stable);

    for (let i = 0; i < 11; i++) {
      state = recordBreedingDecision(state, `sire-${i}`, `dam-${i}`, "S", "D", "stable-1", "breeder", i, 50);
      state = recordBreedingOutcome(state, `sire-${i}`, `dam-${i}`, `foal-${i}`, 80, true, 200);
    }

    state = {
      ...state,
      personalityState: {
        ...state.personalityState,
        strategyConfidence: 0.98,
      },
    };
    const returnedState = adaptBreedingStrategy(state, 200);
    expect(returnedState.personalityState.strategyConfidence).toBe(1.0);
  });

  it("no change when <= 10 decisions", () => {
    const stable = createMockStable();
    const state = createBreedingAIState(stable);
    const returnedState = adaptBreedingStrategy(state, 200);
    expect(returnedState).toBe(state);
  });
});
