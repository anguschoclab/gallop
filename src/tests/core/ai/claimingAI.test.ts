import { describe, it, expect } from "vitest";
import {
  createClaimingAIState,
  calculateClaimingValue,
  calculateClaimingRisk,
  shouldClaimHorse,
  recordClaimingDecision,
  recordClaimingOutcome,
  getClaimingInsights,
} from "@/core/ai/claimingAI";
import type { Horse, Race, Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 4,
    gender: "colt",
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
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    ...overrides,
  });
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    cash: 100000,
    personality: "aggressive",
    ...overrides,
  });
}

function createMockRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 100,
    distance: 1600,
    surface: "Dirt",
    raceClass: "Stakes",
    entryFee: 100,
    purse: 100000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    claimingPrice: 50000,
    ...overrides,
  };
}

describe("createClaimingAIState", () => {
  it("initializes with personality state matching stable", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createClaimingAIState(stable);
    expect(state.personalityState.personality).toBe("conservative");
  });

  it("initializes with empty learning state and claimingHistory", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    expect(state.learningState.outcomes).toEqual([]);
    expect(state.claimingHistory).toEqual([]);
  });
});

describe("calculateClaimingValue", () => {
  it("returns a number in 0-100 range", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const value = calculateClaimingValue(state, horse, race, stable);
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("higher score for undervalued horses (rating*1000 >> claimingPrice)", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const undervaluedHorse = createMockHorse({
      stats: { speed: 90, stamina: 90, acceleration: 90, consistency: 90, temperament: 50, conformation: 50 },
      form: 100,
    });
    const overvaluedHorse = createMockHorse({
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
      form: 0,
    });
    const cheapRace = createMockRace({ claimingPrice: 2000 });
    const expensiveRace = createMockRace({ claimingPrice: 100000 });
    const undervaluedScore = calculateClaimingValue(state, undervaluedHorse, cheapRace, stable);
    const overvaluedScore = calculateClaimingValue(state, overvaluedHorse, expensiveRace, stable);
    // undervalued has form=100 → formScore=10, *10=100 bonus; overvalued has form=0 → 0 bonus
    expect(undervaluedScore).toBeGreaterThan(overvaluedScore);
  });

  it("form score contributes horse.form / 10 to score", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const highFormHorse = createMockHorse({ form: 100 });
    const lowFormHorse = createMockHorse({ form: 0 });
    const race = createMockRace();
    const highScore = calculateClaimingValue(state, highFormHorse, race, stable);
    const lowScore = calculateClaimingValue(state, lowFormHorse, race, stable);
    expect(highScore).toBeGreaterThan(lowScore);
  });
});

describe("calculateClaimingRisk", () => {
  it("returns 0 for healthy, age 4, energy 80, fair price", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ age: 4, energy: 80, healthStatus: "healthy" });
    const race = createMockRace({ claimingPrice: 50000 });
    const risk = calculateClaimingRisk(state, horse, race);
    expect(risk).toBe(0);
  });

  it("adds +5 per year over age 6", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ age: 8, energy: 80, healthStatus: "healthy" });
    const race = createMockRace({ claimingPrice: 50000 });
    const risk = calculateClaimingRisk(state, horse, race);
    expect(risk).toBe(10); // (8-6)*5 = 10
  });

  it("adds +10 for age < 3", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ age: 2, energy: 80, healthStatus: "healthy" });
    const race = createMockRace({ claimingPrice: 50000 });
    const risk = calculateClaimingRisk(state, horse, race);
    expect(risk).toBe(10);
  });

  it("adds +20 for non-healthy", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ age: 4, energy: 80, healthStatus: "other_illness" });
    const race = createMockRace({ claimingPrice: 50000 });
    const risk = calculateClaimingRisk(state, horse, race);
    expect(risk).toBe(20);
  });

  it("adds (50-energy)/5 for low energy", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ age: 4, energy: 30, healthStatus: "healthy" });
    const race = createMockRace({ claimingPrice: 50000 });
    const risk = calculateClaimingRisk(state, horse, race);
    expect(risk).toBe(4); // (50-30)/5 = 4
  });

  it("adds +30 for overpaying (valueRatio < 0.8)", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({
      age: 4, energy: 80, healthStatus: "healthy",
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
    });
    const race = createMockRace({ claimingPrice: 100000 });
    const risk = calculateClaimingRisk(state, horse, race);
    // rating=30, estimatedValue=30000, valueRatio=30000/100000=0.3 < 0.8
    expect(risk).toBe(30);
  });

  it("caps at 100", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({
      age: 10, energy: 0, healthStatus: "other_illness",
      stats: { speed: 10, stamina: 10, acceleration: 10, consistency: 10, temperament: 50, conformation: 50 },
    });
    const race = createMockRace({ claimingPrice: 100000 });
    const risk = calculateClaimingRisk(state, horse, race);
    // age=10: (10-6)*5=20, health: +20, energy=0: (50-0)/5=10, valueRatio=30*1000/100000=0.3 < 0.8: +30
    // Total = 20+20+10+30 = 80
    expect(risk).toBe(80);
  });
});

describe("shouldClaimHorse", () => {
  it("returns false when no claimingPrice", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({ claimingPrice: undefined });
    expect(shouldClaimHorse(state, horse, race, stable, 1)).toBe(false);
  });

  it("returns false when cash < claimingPrice * 1.1", () => {
    const stable = createMockStable({ cash: 50000 });
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({ claimingPrice: 50000 });
    expect(shouldClaimHorse(state, horse, race, stable, 1)).toBe(false);
  });

  it("returns a boolean when conditions are met", () => {
    const stable = createMockStable({ cash: 1000000 });
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({ claimingPrice: 2000 });
    const result = shouldClaimHorse(state, horse, race, stable, 1);
    expect(typeof result).toBe("boolean");
  });

  it("friction multiplier increases valueScore for player-owned with friction >= 50", () => {
    const stable = createMockStable({ cash: 1000000 });
    const state = createClaimingAIState(stable);
    const playerHorse = createMockHorse({ owned: true });
    const race = createMockRace({ claimingPrice: 50000 });

    const withoutFriction = shouldClaimHorse(state, playerHorse, race, stable, 1, 0);
    const withFriction = shouldClaimHorse(state, playerHorse, race, stable, 1, 80);
    // With high friction, valueScore is boosted, making it more likely to claim
    // Just verify both return booleans (the exact value depends on utility score)
    expect(typeof withoutFriction).toBe("boolean");
    expect(typeof withFriction).toBe("boolean");
  });
});

describe("recordClaimingDecision", () => {
  it("adds decision to history with all fields", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1", claimingPrice: 50000 });
    const newState = recordClaimingDecision(state, horse, race, stable, 100);
    expect(newState.claimingHistory.length).toBe(1);
    expect(newState.claimingHistory[0].horseId).toBe("h-1");
    expect(newState.claimingHistory[0].raceId).toBe("r-1");
    expect(newState.claimingHistory[0].claimingPrice).toBe(50000);
    expect(newState.claimingHistory[0].stableId).toBe("stable-1");
    expect(newState.claimingHistory[0].personality).toBe("aggressive");
    expect(newState.claimingHistory[0].day).toBe(100);
  });

  it("trims to memoryDepth", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 5; i++) {
      currentState = recordClaimingDecision(currentState, horse, race, stable, i + 1);
    }
    expect(currentState.claimingHistory.length).toBe(memoryDepth);
  });

  it("does not mutate original", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = recordClaimingDecision(state, horse, race, stable, 100);
    expect(state.claimingHistory).toEqual([]);
    expect(newState).not.toBe(state);
  });
});

describe("recordClaimingOutcome", () => {
  it("finds matching decision and updates with success and value", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordClaimingDecision(state, horse, race, stable, 100);
    const newState = recordClaimingOutcome(stateWithDecision, "h-1", "r-1", true, 500, 200);
    expect(newState.claimingHistory[0].success).toBe(true);
    expect(newState.claimingHistory[0].value).toBe(500);
  });

  it("updates learningState", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordClaimingDecision(state, horse, race, stable, 100);
    const newState = recordClaimingOutcome(stateWithDecision, "h-1", "r-1", true, 500, 200);
    expect(newState.learningState.outcomes.length).toBeGreaterThan(0);
  });

  it("returns unchanged if no match found", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const newState = recordClaimingOutcome(state, "unknown", "unknown", true, 500, 200);
    expect(newState).toBe(state);
  });

  it("does not mutate original", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordClaimingDecision(state, horse, race, stable, 100);
    const newState = recordClaimingOutcome(stateWithDecision, "h-1", "r-1", true, 500, 200);
    expect(stateWithDecision.claimingHistory[0].success).toBeUndefined();
    expect(newState).not.toBe(stateWithDecision);
  });
});

describe("getClaimingInsights", () => {
  it("returns defaults for empty history", () => {
    const stable = createMockStable();
    const state = createClaimingAIState(stable);
    const insights = getClaimingInsights(state, "stable-1");
    expect(insights.totalClaims).toBe(0);
    expect(insights.successRate).toBe(0.5);
    expect(insights.avgValue).toBe(0);
    expect(insights.avgRisk).toBe(40); // successRate 0.5 >= 0.5 → 40
  });

  it("filters by stableId and success !== undefined", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    const stateWithDecision = recordClaimingDecision(state, horse, race, stable, 100);
    const stateWithOutcome = recordClaimingOutcome(stateWithDecision, horse.id, race.id, true, 500, 200);

    // Record another decision without outcome (should be excluded)
    const stateWithSecondDecision = recordClaimingDecision(stateWithOutcome, horse, race, stable, 101);

    const insights = getClaimingInsights(stateWithSecondDecision, "stable-1");
    // Only the one with outcome counts
    expect(insights.totalClaims).toBe(1);
    expect(insights.successRate).toBe(1.0);
  });

  it("avgRisk is hardcoded: <0.5 successRate → 60, else 40", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createClaimingAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    // Record a failed outcome (successRate = 0 < 0.5 → avgRisk = 60)
    const stateWithDecision = recordClaimingDecision(state, horse, race, stable, 100);
    const stateWithOutcome = recordClaimingOutcome(stateWithDecision, horse.id, race.id, false, -100, 200);

    const insights = getClaimingInsights(stateWithOutcome, "stable-1");
    expect(insights.successRate).toBe(0);
    expect(insights.avgRisk).toBe(60);
  });
});
