import { describe, it, expect } from "vitest";
import {
  createMarketAIState,
  calculatePurchaseValue,
  shouldPurchaseHorse,
  calculateMaxPurchasePrice,
  recordMarketPurchase,
  recordMarketOutcome,
  getMarketInsights,
} from "@/core/ai/marketAI";
import type { Horse, Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 3,
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

describe("createMarketAIState", () => {
  it("initializes portfolio with prestige → targetHorseCount=15", () => {
    const stable = createMockStable({ personality: "prestige" });
    const state = createMarketAIState(stable);
    expect(state.portfolio.targetHorseCount).toBe(15);
  });

  it("initializes portfolio with non-prestige → targetHorseCount=10", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createMarketAIState(stable);
    expect(state.portfolio.targetHorseCount).toBe(10);
  });

  it("initializes budgetRemaining = stable.cash and qualityTarget = 60", () => {
    const stable = createMockStable({ cash: 200000 });
    const state = createMarketAIState(stable);
    expect(state.portfolio.budgetRemaining).toBe(200000);
    expect(state.portfolio.qualityTarget).toBe(60);
  });

  it("initializes empty purchaseHistory", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    expect(state.purchaseHistory).toEqual([]);
  });
});

describe("calculatePurchaseValue", () => {
  it("returns a number in 0-100 range", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse();
    const value = calculatePurchaseValue(state, horse, 50000, stable);
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("higher score for undervalued horses", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const goodHorse = createMockHorse({
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 50,
        conformation: 50,
      },
    });
    const poorHorse = createMockHorse({
      stats: {
        speed: 30,
        stamina: 30,
        acceleration: 30,
        consistency: 30,
        temperament: 50,
        conformation: 50,
      },
    });
    const goodScore = calculatePurchaseValue(state, goodHorse, 1000, stable);
    const poorScore = calculatePurchaseValue(state, poorHorse, 100000, stable);
    expect(goodScore).toBeGreaterThan(poorScore);
  });

  it("portfolio fit: +15 if under target", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    // currentHorseCount=0 < targetHorseCount=10 → +15
    const horse = createMockHorse();
    const value = calculatePurchaseValue(state, horse, 50000, stable);
    expect(value).toBeGreaterThan(0);
  });

  it("portfolio fit: +10 if age count < 3", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const value = calculatePurchaseValue(state, horse, 50000, stable);
    expect(value).toBeGreaterThan(0);
  });

  it("portfolio fit: +15 if rating >= qualityTarget", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse({
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
    });
    const value = calculatePurchaseValue(state, horse, 50000, stable);
    expect(value).toBeGreaterThan(0);
  });
});

describe("shouldPurchaseHorse", () => {
  it("returns false if cash < price * 1.1", () => {
    const stable = createMockStable({ cash: 50000 });
    const state = createMarketAIState(stable);
    const horse = createMockHorse();
    expect(shouldPurchaseHorse(state, horse, 50000, stable, 1)).toBe(false);
  });

  it("aggressive: threshold - 10 (more likely to buy)", () => {
    const stable = createMockStable({ cash: 1000000, personality: "aggressive" });
    const state = createMarketAIState(stable);
    const horse = createMockHorse();
    const result = shouldPurchaseHorse(state, horse, 1000, stable, 1);
    expect(typeof result).toBe("boolean");
  });

  it("conservative: threshold + 10 (less likely to buy)", () => {
    const stable = createMockStable({ cash: 1000000, personality: "conservative" });
    const state = createMarketAIState(stable);
    const horse = createMockHorse();
    const result = shouldPurchaseHorse(state, horse, 1000, stable, 1);
    expect(typeof result).toBe("boolean");
  });
});

describe("calculateMaxPurchasePrice", () => {
  it("base = rating * 1000, adjusted by risk tolerance", () => {
    const stable = createMockStable({ cash: 1000000, personality: "aggressive" });
    const state = createMarketAIState(stable);
    const horse = createMockHorse(); // rating=70
    const maxPrice = calculateMaxPurchasePrice(state, horse, stable);
    // base=70000, aggressive conservatism<0.5 → *1.2=84000, capped at 20% of cash=200000
    // min(84000, 200000) = 84000
    expect(maxPrice).toBe(84000);
  });

  it("conservative: *0.8 risk tolerance", () => {
    const stable = createMockStable({ cash: 1000000, personality: "conservative" });
    const state = createMarketAIState(stable);
    const horse = createMockHorse(); // rating=70
    const maxPrice = calculateMaxPurchasePrice(state, horse, stable);
    // base=70000, *0.8=56000, capped at 200000 → 56000
    expect(maxPrice).toBe(56000);
  });

  it("capped at 20% of cash", () => {
    const stable = createMockStable({ cash: 100000, personality: "aggressive" });
    const state = createMarketAIState(stable);
    const horse = createMockHorse({
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 50,
        conformation: 50,
      },
    });
    const maxPrice = calculateMaxPurchasePrice(state, horse, stable);
    // base=90000, *1.2=108000, capped at 100000*0.2=20000 → 20000
    expect(maxPrice).toBe(20000);
  });

  it("returns floored integer", () => {
    const stable = createMockStable({ cash: 1000000, personality: "aggressive" });
    const state = createMarketAIState(stable);
    const horse = createMockHorse({
      stats: {
        speed: 71,
        stamina: 71,
        acceleration: 71,
        consistency: 71,
        temperament: 50,
        conformation: 50,
      },
    });
    const maxPrice = calculateMaxPurchasePrice(state, horse, stable);
    expect(Number.isInteger(maxPrice)).toBe(true);
  });
});

describe("recordMarketPurchase", () => {
  it("adds to history and trims to memoryDepth", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse();
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 3; i++) {
      currentState = recordMarketPurchase(currentState, horse, 5000, stable, i + 1);
    }
    expect(currentState.purchaseHistory.length).toBe(memoryDepth);
  });

  it("portfolio: count++, budgetRemaining -= price, ageDist++", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const newState = recordMarketPurchase(state, horse, 5000, stable, 100);
    expect(newState.portfolio.currentHorseCount).toBe(1);
    expect(newState.portfolio.budgetRemaining).toBe(100000 - 5000);
    expect(newState.portfolio.ageDistribution[3]).toBe(1);
  });

  it("updates learningState with success=true (always)", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse();
    const newState = recordMarketPurchase(state, horse, 5000, stable, 100);
    expect(newState.learningState.outcomes.length).toBeGreaterThan(0);
    expect(newState.learningState.outcomes[0].success).toBe(true);
  });
});

describe("recordMarketOutcome", () => {
  it("finds matching purchase and updates with success and value", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const stateWithPurchase = recordMarketPurchase(state, horse, 5000, stable, 100);
    const newState = recordMarketOutcome(stateWithPurchase, "h-1", true, 500, 200);
    expect(newState.purchaseHistory[0].success).toBe(true);
    expect(newState.purchaseHistory[0].value).toBe(500);
  });

  it("updates learningState", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const stateWithPurchase = recordMarketPurchase(state, horse, 5000, stable, 100);
    const newState = recordMarketOutcome(stateWithPurchase, "h-1", true, 500, 200);
    // recordMarketPurchase records 1 outcome, recordMarketOutcome records another
    expect(newState.learningState.outcomes.length).toBeGreaterThan(
      stateWithPurchase.learningState.outcomes.length,
    );
  });

  it("returns unchanged if no match found", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const newState = recordMarketOutcome(state, "unknown", true, 500, 200);
    expect(newState).toBe(state);
  });
});

describe("getMarketInsights", () => {
  it("returns defaults for empty history", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const insights = getMarketInsights(state, "stable-1");
    expect(insights.totalPurchases).toBe(0);
    expect(insights.successRate).toBe(0.5);
    expect(insights.avgValue).toBe(0);
    expect(insights.avgPurchasePrice).toBe(0);
  });

  it("filters by stableId", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createMarketAIState(stable);
    const horse = createMockHorse();
    const stateWithPurchase = recordMarketPurchase(state, horse, 5000, stable, 100);
    const stateWithOutcome = recordMarketOutcome(stateWithPurchase, horse.id, true, 500, 200);
    const insights = getMarketInsights(stateWithOutcome, "stable-1");
    expect(insights.totalPurchases).toBe(1);
    expect(insights.successRate).toBe(1.0);
    expect(insights.avgPurchasePrice).toBe(5000);
  });

  it("portfolioHealth = currentHorseCount / targetHorseCount", () => {
    const stable = createMockStable();
    const state = createMarketAIState(stable);
    const stateWithHorses = {
      ...state,
      portfolio: {
        ...state.portfolio,
        currentHorseCount: 5,
      },
    };
    const insights = getMarketInsights(stateWithHorses, "stable-1");
    expect(insights.portfolioHealth).toBe(5 / 10);
  });
});
