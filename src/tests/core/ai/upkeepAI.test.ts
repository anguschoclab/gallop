import { describe, it, expect } from "vitest";
import {
  createUpkeepAIState,
  calculateMonthlyExpenseBudget,
  shouldSpendOnCategory,
  updateReserveState,
  shouldConserveCash,
  recordBudgetDecision,
  getBudgetInsights,
} from "@/core/ai/upkeepAI";
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
    stableId: "stable-1",
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

describe("createUpkeepAIState", () => {
  it("initializes with default targetReserveRatio=3", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    expect(state.reserves.targetReserveRatio).toBe(3);
  });

  it("initializes with currentReserveRatio=0", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    expect(state.reserves.currentReserveRatio).toBe(0);
  });

  it("initializes with empty budgetHistory", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    expect(state.budgetHistory).toEqual([]);
  });
});

describe("calculateMonthlyExpenseBudget", () => {
  it("calculates budget based on horse count * 500 * spendingMultiplier", () => {
    const stable = createMockStable({ id: "stable-1", personality: "aggressive" });
    const state = createUpkeepAIState(stable);
    const horses = [
      createMockHorse({ id: "h1", stableId: "stable-1" }),
      createMockHorse({ id: "h2", stableId: "stable-1" }),
    ];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    // 2 horses * 500 = 1000, * 1.3 (aggressive) = 1300
    expect(budget.totalBudget).toBe(1300);
  });

  it("aggressive: spendingMultiplier = 1.3", () => {
    const stable = createMockStable({ id: "stable-1", personality: "aggressive" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    expect(budget.totalBudget).toBe(650); // 500 * 1.3
  });

  it("conservative: spendingMultiplier = 0.8", () => {
    const stable = createMockStable({ id: "stable-1", personality: "conservative" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    expect(budget.totalBudget).toBe(400); // 500 * 0.8
  });

  it("category budgets: feed=30%, veterinary=20%, training=25%, staff=15%, facilities=10%", () => {
    const stable = createMockStable({ id: "stable-1", personality: "aggressive" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    // 1 horse * 500 = 500, * 1.3 (aggressive) = 650
    expect(budget.categoryBudgets.feed).toBe(650 * 0.3);
    expect(budget.categoryBudgets.veterinary).toBe(650 * 0.2);
    expect(budget.categoryBudgets.training).toBe(650 * 0.25);
    expect(budget.categoryBudgets.staff).toBe(650 * 0.15);
    expect(budget.categoryBudgets.facilities).toBe(650 * 0.1);
  });

  it("developer: categoryAdjustments multiplies veterinary *= 1.2", () => {
    const stable = createMockStable({ id: "stable-1", personality: "developer" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    // base = 500 * 1.1 = 550, veterinary = 550 * 0.2 = 110, * 1.2 = 132
    expect(budget.categoryBudgets.veterinary).toBe(132);
  });

  it("win-now: categoryAdjustments multiplies training *= 1.3", () => {
    const stable = createMockStable({ id: "stable-1", personality: "win-now" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    // base = 500 * 1.0 = 500, training = 500 * 0.25 = 125, * 1.3 = 162.5
    expect(budget.categoryBudgets.training).toBe(162.5);
  });

  it("reserveTarget = monthlyExpenses * targetReserveRatio", () => {
    const stable = createMockStable({ id: "stable-1", personality: "conservative" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    // monthlyExpenses = 500, targetReserveRatio = 6
    expect(budget.reserveTarget).toBe(3000);
  });

  it("filters horses by stableId", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createUpkeepAIState(stable);
    const horses = [
      createMockHorse({ id: "h1", stableId: "stable-1" }),
      createMockHorse({ id: "h2", stableId: "stable-2" }),
    ];
    const budget = calculateMonthlyExpenseBudget(state, stable, horses, 1);
    // Only 1 horse matches → 500 * 1.3 = 650
    expect(budget.totalBudget).toBe(650);
  });
});

describe("shouldSpendOnCategory", () => {
  it("returns false when cash < reserveTarget", () => {
    const stable = createMockStable({ cash: 100, id: "stable-1", personality: "conservative" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    // 1 horse: monthlyExpenses = 500, reserveTarget = 500 * 6 = 3000, cash = 100 < 3000
    const result = shouldSpendOnCategory(state, "feed", 10, stable, horses, 1);
    expect(result).toBe(false);
  });

  it("returns true when amount within budget and propensity", () => {
    const stable = createMockStable({ cash: 1000000, id: "stable-1", personality: "aggressive" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    // 1 horse: totalBudget = 650, feed budget = 195, propensity = 0.8
    // budgetRatio = 100 / 195 ≈ 0.51 <= 0.8 → true
    const result = shouldSpendOnCategory(state, "feed", 100, stable, horses, 1);
    expect(result).toBe(true);
  });

  it("returns false when amount exceeds category budget", () => {
    const stable = createMockStable({ cash: 1000000, id: "stable-1", personality: "aggressive" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    // feed budget = 195, propensity = 0.8, max amount = 195 * 0.8 = 156
    // amount = 200 → budgetRatio = 200/195 ≈ 1.03 > 0.8 → false
    const result = shouldSpendOnCategory(state, "feed", 200, stable, horses, 1);
    expect(result).toBe(false);
  });

  it("win-now: categoryPropensity for training = 0.9", () => {
    const stable = createMockStable({ cash: 1000000, id: "stable-1", personality: "win-now" });
    const state = createUpkeepAIState(stable);
    const horses = [createMockHorse({ stableId: "stable-1" })];
    // 1 horse: totalBudget = 500, training = 125 * 1.3 = 162.5, propensity = 0.9
    // budgetRatio = 100 / 162.5 ≈ 0.615 <= 0.9 → true
    const result = shouldSpendOnCategory(state, "training", 100, stable, horses, 1);
    expect(result).toBe(true);
  });
});

describe("updateReserveState", () => {
  it("updates targetReserveRatio from personality", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createUpkeepAIState(stable);
    const newState = updateReserveState(state, stable, 1000, 50);
    expect(newState.reserves.targetReserveRatio).toBe(6); // conservative = 6
  });

  it("updates currentReserveRatio = cash / monthlyExpenses", () => {
    const stable = createMockStable({ cash: 5000 });
    const state = createUpkeepAIState(stable);
    const newState = updateReserveState(state, stable, 1000, 50);
    expect(newState.reserves.currentReserveRatio).toBe(5);
  });

  it("handles monthlyExpenses = 0 (divides by 1)", () => {
    const stable = createMockStable({ cash: 5000 });
    const state = createUpkeepAIState(stable);
    const newState = updateReserveState(state, stable, 0, 50);
    expect(newState.reserves.currentReserveRatio).toBe(5000);
  });

  it("updates lastAdjustmentDay", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    const newState = updateReserveState(state, stable, 1000, 50);
    expect(newState.reserves.lastAdjustmentDay).toBe(50);
  });
});

describe("shouldConserveCash", () => {
  it("returns true when currentReserveRatio < targetReserveRatio", () => {
    const stable = createMockStable({ cash: 1000 });
    const state = createUpkeepAIState(stable);
    // Set target = 6 (conservative)
    const stateWithTarget = {
      ...state,
      reserves: { ...state.reserves, targetReserveRatio: 6 },
    };
    // currentReserveRatio = 1000 / 1000 = 1 < 6 → true
    expect(shouldConserveCash(stateWithTarget, stable, 1000)).toBe(true);
  });

  it("returns true when currentReserveRatio < target + buffer", () => {
    const stable = createMockStable({ cash: 6500, personality: "conservative" });
    const state = createUpkeepAIState(stable);
    const stateWithTarget = {
      ...state,
      reserves: { ...state.reserves, targetReserveRatio: 6 },
    };
    // currentReserveRatio = 6500 / 1000 = 6.5, target = 6, buffer = 1.0
    // 6.5 < 6 + 1.0 = 7 → true
    expect(shouldConserveCash(stateWithTarget, stable, 1000)).toBe(true);
  });

  it("returns false when currentReserveRatio >= target + buffer", () => {
    const stable = createMockStable({ cash: 8000, personality: "conservative" });
    const state = createUpkeepAIState(stable);
    const stateWithTarget = {
      ...state,
      reserves: { ...state.reserves, targetReserveRatio: 6 },
    };
    // currentReserveRatio = 8000 / 1000 = 8, target = 6, buffer = 1.0
    // 8 >= 7 → false
    expect(shouldConserveCash(stateWithTarget, stable, 1000)).toBe(false);
  });

  it("aggressive: buffer = 0.2 (less likely to conserve)", () => {
    const stable = createMockStable({ cash: 6500, personality: "aggressive" });
    const state = createUpkeepAIState(stable);
    const stateWithTarget = {
      ...state,
      reserves: { ...state.reserves, targetReserveRatio: 2 },
    };
    // currentReserveRatio = 6500 / 1000 = 6.5, target = 2, buffer = 0.2
    // 6.5 >= 2.2 → false
    expect(shouldConserveCash(stateWithTarget, stable, 1000)).toBe(false);
  });
});

describe("recordBudgetDecision", () => {
  it("adds to budgetHistory and trims to memoryDepth", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 3; i++) {
      currentState = recordBudgetDecision(currentState, 1000, 800, {}, stable, i + 1);
    }
    expect(currentState.budgetHistory.length).toBe(memoryDepth);
  });

  it("success field set on BudgetDecision when spent <= totalBudget * 1.1", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    const newState = recordBudgetDecision(state, 1000, 800, {}, stable, 1);
    expect(newState.budgetHistory[0].success).toBe(true);
    expect(newState.learningState.outcomes.length).toBeGreaterThan(0);
    expect(newState.learningState.outcomes[0].success).toBe(true);
  });

  it("success field set to false on BudgetDecision when spent > totalBudget * 1.1", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    const newState = recordBudgetDecision(state, 1000, 1200, {}, stable, 1);
    expect(newState.budgetHistory[0].success).toBe(false);
    expect(newState.learningState.outcomes[0].success).toBe(false);
  });

  it("updates learningState and personalityState", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    const newState = recordBudgetDecision(state, 1000, 800, {}, stable, 1);
    expect(newState.learningState.outcomes.length).toBeGreaterThan(0);
    expect(newState.personalityState.learningState.outcomes.length).toBeGreaterThan(0);
  });

  it("records reserved = cash - spent", () => {
    const stable = createMockStable({ cash: 5000 });
    const state = createUpkeepAIState(stable);
    const newState = recordBudgetDecision(state, 1000, 800, {}, stable, 1);
    expect(newState.budgetHistory[0].reserved).toBe(5000 - 800);
  });
});

describe("getBudgetInsights", () => {
  it("returns defaults for empty history", () => {
    const stable = createMockStable();
    const state = createUpkeepAIState(stable);
    const insights = getBudgetInsights(state, "stable-1");
    expect(insights.totalBudgets).toBe(0);
    expect(insights.avgSpending).toBe(0);
    expect(insights.budgetAdherence).toBe(1);
  });

  it("filters by stableId and calculates stats", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createUpkeepAIState(stable);
    const stateWithDecision = recordBudgetDecision(state, 1000, 800, { feed: 800 }, stable, 1);
    const insights = getBudgetInsights(stateWithDecision, "stable-1");
    expect(insights.totalBudgets).toBe(1);
    expect(insights.avgSpending).toBe(800);
    expect(insights.budgetAdherence).toBe(1);
  });

  it("budgetAdherence calculates correctly from success field", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createUpkeepAIState(stable);
    let currentState = state;
    currentState = recordBudgetDecision(currentState, 1000, 800, {}, stable, 1); // success
    currentState = recordBudgetDecision(currentState, 1000, 1200, {}, stable, 2); // failure
    const insights = getBudgetInsights(currentState, "stable-1");
    expect(insights.totalBudgets).toBe(2);
    expect(insights.budgetAdherence).toBe(0.5);
  });
});
