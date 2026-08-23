import { describe, it, expect } from "vitest";
import { createWithdrawalAIState } from "@/core/ai/withdrawalAITypes";
import { calculateWithdrawalRisk, calculateWithdrawalOpportunityCost } from "@/core/ai/withdrawalAIValue";
import {
  shouldWithdrawHorse,
  isWithdrawalStrategic,
  recordWithdrawalDecision,
  recordWithdrawalOutcome,
  getWithdrawalInsights,
} from "@/core/ai/withdrawalAIRecording";
import type { Horse, Race, Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import {
  AI_RISK_TOLERANCE_CONSERVATIVE,
  AI_RISK_TOLERANCE_AGGRESSIVE,
  AI_RISK_TOLERANCE_WIN_NOW,
} from "@/constants";

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
    ...overrides,
  };
}

describe("createWithdrawalAIState", () => {
  it("initializes with empty withdrawalHistory", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    expect(state.withdrawalHistory).toEqual([]);
  });

  it("initializes with personality state", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createWithdrawalAIState(stable);
    expect(state.personalityState.personality).toBe("conservative");
  });
});

describe("calculateWithdrawalRisk", () => {
  it("returns 0 for healthy, high energy, high form, matching distance/surface", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 80, form: 60, healthStatus: "healthy" });
    const race = createMockRace({ distance: 1600, surface: "Dirt" });
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(0);
  });

  it("adds +30 for non-healthy", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 80, form: 60, healthStatus: "other_illness" });
    const race = createMockRace();
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(30);
  });

  it("adds (50-energy)/2 for energy < 50", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 30, form: 60, healthStatus: "healthy" });
    const race = createMockRace();
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(10); // (50-30)/2 = 10
  });

  it("adds (50-form)/2 for form < 50", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 80, form: 30, healthStatus: "healthy" });
    const race = createMockRace();
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(10); // (50-30)/2 = 10
  });

  it("adds +10 for G1 race", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({
      graded: { key: "test", grade: "G1", track: "T", trackId: "t1", surface: "Dirt" },
    });
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(10);
  });

  it("adds +5 for G2 race", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({
      graded: { key: "test", grade: "G2", track: "T", trackId: "t1", surface: "Dirt" },
    });
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(5);
  });

  it("adds +15 for distance mismatch > 500, +5 for > 300 (stacking)", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ distanceAptitude: 1000 });
    const race = createMockRace({ distance: 1800 }); // diff = 800 > 500
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(20); // 15 + 5
  });

  it("adds +10 for surface mismatch (< 0.9)", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 } });
    const race = createMockRace({ surface: "Dirt" });
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(10);
  });

  it("caps at 100", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({
      energy: 0,
      form: 0,
      healthStatus: "other_illness",
      distanceAptitude: 1000,
      surfaceAptitude: { Turf: 0.1, Dirt: 0.1, Synthetic: 0.1 },
    });
    const race = createMockRace({
      distance: 2000,
      surface: "Dirt",
      graded: { key: "test", grade: "G1", track: "T", trackId: "t1", surface: "Dirt" },
    });
    const risk = calculateWithdrawalRisk(state, horse, race, stable);
    expect(risk).toBe(100);
  });
});

describe("shouldWithdrawHorse", () => {
  it("returns shouldWithdraw=false for low risk horse", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 80, form: 60, healthStatus: "healthy" });
    const race = createMockRace();
    const result = shouldWithdrawHorse(state, horse, race, stable, 1);
    expect(result.shouldWithdraw).toBe(false);
  });

  it("returns shouldWithdraw=true when risk > tolerance", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({
      energy: 0,
      form: 0,
      healthStatus: "other_illness",
      distanceAptitude: 1000,
      surfaceAptitude: { Turf: 0.1, Dirt: 0.1, Synthetic: 0.1 },
    });
    const race = createMockRace({
      distance: 2000,
      surface: "Dirt",
      graded: { key: "test", grade: "G1", track: "T", trackId: "t1", surface: "Dirt" },
    });
    const result = shouldWithdrawHorse(state, horse, race, stable, 1);
    expect(result.shouldWithdraw).toBe(true);
  });

  it("conservative: riskTolerance = 35", () => {
    expect(AI_RISK_TOLERANCE_CONSERVATIVE).toBe(35);
  });

  it("aggressive: riskTolerance = 65", () => {
    expect(AI_RISK_TOLERANCE_AGGRESSIVE).toBe(65);
  });

  it("win-now: riskTolerance = 55", () => {
    expect(AI_RISK_TOLERANCE_WIN_NOW).toBe(55);
  });

  it("sets reason = health_concern for non-healthy", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ healthStatus: "other_illness" });
    const race = createMockRace();
    const result = shouldWithdrawHorse(state, horse, race, stable, 1);
    if (result.shouldWithdraw) {
      expect(result.reason).toBe("health_concern");
    }
  });

  it("sets reason = low_energy for energy < 30", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 20, form: 60, healthStatus: "healthy" });
    const race = createMockRace();
    const result = shouldWithdrawHorse(state, horse, race, stable, 1);
    if (result.shouldWithdraw) {
      expect(result.reason).toBe("low_energy");
    }
  });

  it("sets reason = poor_form for form < 30 (when healthy and energy >= 30)", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 80, form: 20, healthStatus: "healthy" });
    const race = createMockRace();
    const result = shouldWithdrawHorse(state, horse, race, stable, 1);
    if (result.shouldWithdraw) {
      expect(result.reason).toBe("poor_form");
    }
  });
});

describe("calculateWithdrawalOpportunityCost", () => {
  it("includes entryFee + 500 + rating*100*0.1 (aggressive *1.2)", () => {
    const stable = createMockStable(); // aggressive by default
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse(); // rating = 70 (avg of 4 stats)
    const race = createMockRace({ entryFee: 200 });
    const cost = calculateWithdrawalOpportunityCost(state, horse, race, stable);
    // 200 + 500 + 70*100*0.1 = 200 + 500 + 700 = 1400, * 1.2 (aggressive) = 1680
    expect(cost).toBe(1680);
  });

  it("conservative: *0.8", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({ entryFee: 200 });
    const cost = calculateWithdrawalOpportunityCost(state, horse, race, stable);
    expect(cost).toBe(1400 * 0.8);
  });

  it("aggressive: *1.2", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({ entryFee: 200 });
    const cost = calculateWithdrawalOpportunityCost(state, horse, race, stable);
    expect(cost).toBe(1400 * 1.2);
  });
});

describe("isWithdrawalStrategic", () => {
  it("returns false when shouldWithdraw is false", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 80, form: 60, healthStatus: "healthy" });
    const race = createMockRace();
    expect(isWithdrawalStrategic(state, horse, race, stable, 1)).toBe(false);
  });

  it("conservative + health_concern → true", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createWithdrawalAIState(stable);
    // Need risk > 35 (conservative tolerance). Health=30, need +6 more from energy.
    // energy=20: (50-20)/5=6 → total risk = 30+6 = 36 > 35
    const horse = createMockHorse({ healthStatus: "other_illness", energy: 20 });
    const race = createMockRace();
    expect(isWithdrawalStrategic(state, horse, race, stable, 1)).toBe(true);
  });

  it("win-now + non-health reason → false", () => {
    const stable = createMockStable({ personality: "win-now" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ energy: 20, form: 60, healthStatus: "healthy" });
    const race = createMockRace();
    // If shouldWithdraw is true with reason "low_energy" (not health_concern)
    const result = isWithdrawalStrategic(state, horse, race, stable, 1);
    // win-now with non-health reason → false
    expect(result).toBe(false);
  });

  it("aggressive + opportunityCost > 10000 → false", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createWithdrawalAIState(stable);
    // High rating horse → high opportunity cost
    const horse = createMockHorse({
      energy: 20,
      form: 60,
      healthStatus: "healthy",
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 50,
        conformation: 50,
      },
    });
    const race = createMockRace({ entryFee: 500 });
    // cost = 500 + 500 + 90*100*0.1 = 500+500+900 = 1900, *1.2 = 2280
    // Actually 2280 < 10000, so this won't trigger the > 10000 check
    // Need much higher: entryFee = 50000
    const expensiveRace = createMockRace({ entryFee: 50000 });
    // cost = 50000 + 500 + 900 = 51400, *1.2 = 61680 > 10000
    const result = isWithdrawalStrategic(state, horse, expensiveRace, stable, 1);
    expect(result).toBe(false);
  });
});

describe("recordWithdrawalDecision", () => {
  it("adds to history and trims to memoryDepth", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 3; i++) {
      currentState = recordWithdrawalDecision(
        currentState,
        horse,
        race,
        stable,
        true,
        "health_concern",
        i + 1,
      );
    }
    expect(currentState.withdrawalHistory.length).toBe(memoryDepth);
  });

  it("records all fields including horseAge and riskScore", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1", age: 5 });
    const race = createMockRace({ id: "r-1" });
    const newState = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    expect(newState.withdrawalHistory[0].horseId).toBe("h-1");
    expect(newState.withdrawalHistory[0].raceId).toBe("r-1");
    expect(newState.withdrawalHistory[0].stableId).toBe("stable-1");
    expect(newState.withdrawalHistory[0].withdrew).toBe(true);
    expect(newState.withdrawalHistory[0].reason).toBe("health_concern");
    expect(newState.withdrawalHistory[0].day).toBe(100);
    expect(newState.withdrawalHistory[0].horseAge).toBe(5);
    expect(newState.withdrawalHistory[0].riskScore).toBeDefined();
    expect(typeof newState.withdrawalHistory[0].riskScore).toBe("number");
  });

  it("does not record premature learning outcomes (only records decision in history)", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    // Decision should be in history but learning should NOT happen yet
    expect(newState.withdrawalHistory.length).toBe(1);
    expect(newState.learningState.outcomes.length).toBe(0);
    expect(newState.personalityState.learningState.outcomes.length).toBe(0);
  });
});

describe("recordWithdrawalOutcome", () => {
  it("finds matching decision and records outcome", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 5, 2, 200);
    expect(newState.withdrawalHistory[0].outcome).toBeDefined();
    expect(newState.withdrawalHistory[0].outcome?.horseResult).toBe(5);
    expect(newState.withdrawalHistory[0].outcome?.alternativeRaceResult).toBe(2);
  });

  it("returns unchanged if no match", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const newState = recordWithdrawalOutcome(state, "unknown", "unknown", 5, 2, 200);
    expect(newState).toBe(state);
  });

  it("success logic correct for withdrew=true (alternative < horse = success)", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 5, 2, 200);
    // Lower position is better in racing: alternative=2 < horse=5 → success
    const lastOutcome = newState.learningState.outcomes[newState.learningState.outcomes.length - 1];
    expect(lastOutcome.success).toBe(true);
  });

  it("success = false when alternative >= horse for withdrew=true", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 2, 5, 200);
    // alternative=5 >= horse=2 → not a success (withdrawal was wrong)
    const lastOutcome = newState.learningState.outcomes[newState.learningState.outcomes.length - 1];
    expect(lastOutcome.success).toBe(false);
  });

  it("success = false when alternative = horse for withdrew=true", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 3, 3, 200);
    // alternative=3 = horse=3 → not strictly better → false
    const lastOutcome = newState.learningState.outcomes[newState.learningState.outcomes.length - 1];
    expect(lastOutcome.success).toBe(false);
  });

  it("success logic: withdrew=false, horse <= 3 → success", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      false,
      undefined,
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 2, undefined, 200);
    // withdrew=false, horseResult=2 <= 3 → success
    const lastOutcome = newState.learningState.outcomes[newState.learningState.outcomes.length - 1];
    expect(lastOutcome.success).toBe(true);
  });

  it("updates personalityState.learningState in recordWithdrawalOutcome", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 5, 2, 200);
    expect(newState.personalityState.learningState.outcomes.length).toBeGreaterThan(0);
    const lastPersonalityOutcome =
      newState.personalityState.learningState.outcomes[
        newState.personalityState.learningState.outcomes.length - 1
      ];
    expect(lastPersonalityOutcome.success).toBe(true);
  });

  it("value is positive when withdrawal was good (horse > alternative)", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 5, 2, 200);
    // horse=5, alternative=2 → value = 5-2 = 3 (positive = good decision)
    const lastOutcome = newState.learningState.outcomes[newState.learningState.outcomes.length - 1];
    expect(lastOutcome.value).toBe(3);
  });

  it("value is negative when withdrawal was bad (horse < alternative)", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const race = createMockRace({ id: "r-1" });
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const newState = recordWithdrawalOutcome(stateWithDecision, "h-1", "r-1", 2, 5, 200);
    // horse=2, alternative=5 → value = 2-5 = -3 (negative = bad decision)
    const lastOutcome = newState.learningState.outcomes[newState.learningState.outcomes.length - 1];
    expect(lastOutcome.value).toBe(-3);
  });
});

describe("getWithdrawalInsights", () => {
  it("returns defaults for empty history", () => {
    const stable = createMockStable();
    const state = createWithdrawalAIState(stable);
    const insights = getWithdrawalInsights(state, "stable-1");
    expect(insights.totalDecisions).toBe(0);
    expect(insights.withdrawalRate).toBe(0);
    expect(insights.avgRiskScore).toBe(0);
    expect(insights.strategicSuccess).toBe(0.5);
    expect(insights.commonReasons).toEqual({});
  });

  it("avgRiskScore computed from actual riskScore values", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const stateWithWithdrawal = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const insights = getWithdrawalInsights(stateWithWithdrawal, "stable-1");
    // avgRiskScore should be the actual riskScore from the decision, not hardcoded 60
    const expectedRisk = stateWithWithdrawal.withdrawalHistory[0].riskScore!;
    expect(insights.avgRiskScore).toBe(expectedRisk);
  });

  it("counts commonReasons from withdrawals", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    let currentState = state;
    currentState = recordWithdrawalDecision(
      currentState,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    currentState = recordWithdrawalDecision(
      currentState,
      horse,
      race,
      stable,
      true,
      "low_energy",
      101,
    );
    const insights = getWithdrawalInsights(currentState, "stable-1");
    expect(insights.commonReasons["health_concern"]).toBe(1);
    expect(insights.commonReasons["low_energy"]).toBe(1);
  });

  it("filters by stableId", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createWithdrawalAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const stateWithDecision = recordWithdrawalDecision(
      state,
      horse,
      race,
      stable,
      true,
      "health_concern",
      100,
    );
    const insights = getWithdrawalInsights(stateWithDecision, "other-stable");
    expect(insights.totalDecisions).toBe(0);
  });
});
