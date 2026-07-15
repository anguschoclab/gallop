import { describe, it, expect } from "vitest";
import {
  createRaceEntryAIState,
  calculateStrategicEntryScore,
  updateHorseDevelopment,
  recordRaceEntryOutcome,
  generateMultiRaceStrategy,
  adaptStrategy,
} from "@/core/ai/raceEntryAI";
import type { Horse, Race, Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { RECENT_RACES_MAX_COUNT } from "@/constants";

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
    name: "Test Stable",
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

describe("createRaceEntryAIState", () => {
  it("initializes with personality state matching stable personality", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createRaceEntryAIState(stable);
    expect(state.personalityState.personality).toBe("aggressive");
  });

  it("initializes with empty learning state outcomes", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    expect(state.learningState.outcomes).toEqual([]);
  });

  it("initializes with empty strategic plan", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    expect(state.strategicPlan.targetRaces).toEqual([]);
    expect(state.strategicPlan.horseDevelopment).toEqual({});
    expect(state.strategicPlan.budgetAllocation).toEqual({});
  });

  it("different personalities produce different personalityState configs", () => {
    const aggressiveState = createRaceEntryAIState(createMockStable({ personality: "aggressive" }));
    const conservativeState = createRaceEntryAIState(
      createMockStable({ personality: "conservative" }),
    );
    expect(aggressiveState.personalityState.conservatism).not.toBe(
      conservativeState.personalityState.conservatism,
    );
  });
});

describe("calculateStrategicEntryScore", () => {
  it("returns a finite number", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const score = calculateStrategicEntryScore(state, horse, race, stable, 1);
    expect(typeof score).toBe("number");
    expect(Number.isFinite(score)).toBe(true);
  });

  it("score varies by personality for same horse and race", () => {
    const aggressiveStable = createMockStable({ personality: "aggressive" });
    const conservativeStable = createMockStable({ personality: "conservative" });
    const aggState = createRaceEntryAIState(aggressiveStable);
    const conState = createRaceEntryAIState(conservativeStable);
    const horse = createMockHorse();
    const race = createMockRace();
    const aggScore = calculateStrategicEntryScore(aggState, horse, race, aggressiveStable, 1);
    const conScore = calculateStrategicEntryScore(conState, horse, race, conservativeStable, 1);
    expect(aggScore).not.toBe(conScore);
  });

  it("adds +15 strategic bonus when dev track target grade matches race grade", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({ graded: { key: "test", grade: "G3", track: "T", trackId: "t1", surface: "Dirt" } });

    // Add a dev track matching G3
    const stateWithDev = {
      ...state,
      strategicPlan: {
        ...state.strategicPlan,
        horseDevelopment: {
          [horse.id]: {
            horseId: horse.id,
            targetGrade: "G3",
            currentProgress: 0,
            recentRaces: [] as Array<{ raceId: string; position: number; beyer: number }>,
            projectedPeak: 365,
          },
        },
      },
    };

    const scoreWithDev = calculateStrategicEntryScore(stateWithDev, horse, race, stable, 1);
    const scoreWithoutDev = calculateStrategicEntryScore(state, horse, race, stable, 1);
    expect(scoreWithDev - scoreWithoutDev).toBe(15);
  });

  it("adds +10 strategic bonus when horse is approaching projected peak (0-60 days)", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    const stateWithDev = {
      ...state,
      strategicPlan: {
        ...state.strategicPlan,
        horseDevelopment: {
          [horse.id]: {
            horseId: horse.id,
            targetGrade: "open",
            currentProgress: 0,
            recentRaces: [] as Array<{ raceId: string; position: number; beyer: number }>,
            projectedPeak: 50, // 50 days ahead
          },
        },
      },
    };

    const scoreWithDev = calculateStrategicEntryScore(stateWithDev, horse, race, stable, 1);
    const scoreWithoutDev = calculateStrategicEntryScore(state, horse, race, stable, 1);
    expect(scoreWithDev - scoreWithoutDev).toBe(10);
  });

  it("adds -5 penalty when purse > budgetAllocation * 2 and budget > 0", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace({ purse: 100000 });

    const stateWithBudget = {
      ...state,
      strategicPlan: {
        ...state.strategicPlan,
        budgetAllocation: { "race-1": 1000 }, // purse 100000 > 1000 * 2 = 2000
      },
    };

    const scoreWithBudget = calculateStrategicEntryScore(stateWithBudget, horse, race, stable, 1);
    const scoreWithoutBudget = calculateStrategicEntryScore(state, horse, race, stable, 1);
    expect(scoreWithBudget - scoreWithoutBudget).toBe(-5);
  });
});

describe("updateHorseDevelopment", () => {
  it("creates new dev track for horse not in development map", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse({ id: "new-horse" });
    const race = createMockRace();
    const newState = updateHorseDevelopment(state, horse, race, 1, 80);
    expect(newState.strategicPlan.horseDevelopment["new-horse"]).toBeDefined();
    expect(newState.strategicPlan.horseDevelopment["new-horse"].horseId).toBe("new-horse");
  });

  it("adds +10 progress for position <= 3", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = updateHorseDevelopment(state, horse, race, 2, 80);
    expect(newState.strategicPlan.horseDevelopment[horse.id].currentProgress).toBe(10);
  });

  it("adds +5 progress for position <= 5 (but > 3)", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = updateHorseDevelopment(state, horse, race, 4, 80);
    expect(newState.strategicPlan.horseDevelopment[horse.id].currentProgress).toBe(5);
  });

  it("upgrades target grade when progress > 80 (open -> G3)", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const stateWithDev = {
      ...state,
      strategicPlan: {
        ...state.strategicPlan,
        horseDevelopment: {
          [horse.id]: {
            horseId: horse.id,
            targetGrade: "open",
            currentProgress: 85,
            recentRaces: [] as Array<{ raceId: string; position: number; beyer: number }>,
            projectedPeak: 365,
          },
        },
      },
    };
    const newState = updateHorseDevelopment(stateWithDev, horse, race, 1, 80);
    expect(newState.strategicPlan.horseDevelopment[horse.id].targetGrade).toBe("G3");
    expect(newState.strategicPlan.horseDevelopment[horse.id].currentProgress).toBe(0);
  });

  it("upgrades target grade G3 -> G2 -> G1", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    let stateWithDev = {
      ...state,
      strategicPlan: {
        ...state.strategicPlan,
        horseDevelopment: {
          [horse.id]: {
            horseId: horse.id,
            targetGrade: "G3",
            currentProgress: 85,
            recentRaces: [] as Array<{ raceId: string; position: number; beyer: number }>,
            projectedPeak: 365,
          },
        },
      },
    };
    stateWithDev = updateHorseDevelopment(stateWithDev, horse, race, 1, 80);
    expect(stateWithDev.strategicPlan.horseDevelopment[horse.id].targetGrade).toBe("G2");

    stateWithDev = {
      ...stateWithDev,
      strategicPlan: {
        ...stateWithDev.strategicPlan,
        horseDevelopment: {
          [horse.id]: {
            ...stateWithDev.strategicPlan.horseDevelopment[horse.id],
            currentProgress: 85,
          },
        },
      },
    };
    stateWithDev = updateHorseDevelopment(stateWithDev, horse, race, 1, 80);
    expect(stateWithDev.strategicPlan.horseDevelopment[horse.id].targetGrade).toBe("G1");
  });

  it("stays at G1 when progress > 80 and already at G1", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const stateWithDev = {
      ...state,
      strategicPlan: {
        ...state.strategicPlan,
        horseDevelopment: {
          [horse.id]: {
            horseId: horse.id,
            targetGrade: "G1",
            currentProgress: 85,
            recentRaces: [] as Array<{ raceId: string; position: number; beyer: number }>,
            projectedPeak: 365,
          },
        },
      },
    };
    const newState = updateHorseDevelopment(stateWithDev, horse, race, 1, 80);
    expect(newState.strategicPlan.horseDevelopment[horse.id].targetGrade).toBe("G1");
  });

  it(`trims recent races to RECENT_RACES_MAX_COUNT (${RECENT_RACES_MAX_COUNT})`, () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    let currentState = state;
    for (let i = 0; i < RECENT_RACES_MAX_COUNT + 3; i++) {
      currentState = updateHorseDevelopment(currentState, horse, race, i + 1, 80);
    }
    expect(currentState.strategicPlan.horseDevelopment[horse.id].recentRaces.length).toBe(
      RECENT_RACES_MAX_COUNT,
    );
  });

  it("does not mutate original state", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = updateHorseDevelopment(state, horse, race, 1, 80);
    expect(state.strategicPlan.horseDevelopment).toEqual({});
    expect(newState).not.toBe(state);
  });

  it("new horse gets projectedPeak based on age", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const youngHorse = createMockHorse({ id: "young", age: 2 });
    const race = createMockRace();
    const newState = updateHorseDevelopment(state, youngHorse, race, 1, 80);
    const dev = newState.strategicPlan.horseDevelopment["young"];
    expect(dev.projectedPeak).toBe(2 * 365 + 365); // age < 4: age * 365 + 365
  });
});

describe("recordRaceEntryOutcome", () => {
  it("records to personalityState learning", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = recordRaceEntryOutcome(state, horse, race, 100, true, 1);
    expect(newState.personalityState.learningState.outcomes.length).toBeGreaterThan(0);
  });

  it("value = (10 - position) * 10 when success && position", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = recordRaceEntryOutcome(state, horse, race, 100, true, 2);
    const lastOutcome =
      newState.personalityState.learningState.outcomes[
        newState.personalityState.learningState.outcomes.length - 1
      ];
    expect(lastOutcome.value).toBe((10 - 2) * 10);
  });

  it("value = 0 when not successful", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = recordRaceEntryOutcome(state, horse, race, 100, false, 5);
    const lastOutcome =
      newState.personalityState.learningState.outcomes[
        newState.personalityState.learningState.outcomes.length - 1
      ];
    expect(lastOutcome.value).toBe(0);
  });

  it("does not mutate original state", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();
    const newState = recordRaceEntryOutcome(state, horse, race, 100, true, 1);
    expect(state.personalityState.learningState.outcomes).toEqual([]);
    expect(newState).not.toBe(state);
  });
});

describe("generateMultiRaceStrategy", () => {
  it("filters upcoming races (day > currentDay, day <= currentDay + daysAhead, !resolved)", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse({ stableId: "stable-1" });
    const races = [
      createMockRace({ id: "past", day: 50, resolved: false }),
      createMockRace({ id: "future-1", day: 105, resolved: false }),
      createMockRace({ id: "future-2", day: 110, resolved: false }),
      createMockRace({ id: "too-far", day: 200, resolved: false }),
      createMockRace({ id: "resolved", day: 105, resolved: true }),
    ];
    const strategy = generateMultiRaceStrategy(state, stable, [horse], races, 100, 20);
    expect(strategy["past"]).toBeUndefined();
    expect(strategy["too-far"]).toBeUndefined();
    expect(strategy["resolved"]).toBeUndefined();
  });

  it("only assigns horses where stableId matches stable.id", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createRaceEntryAIState(stable);
    const matchingHorse = createMockHorse({ id: "match", stableId: "stable-1" });
    const nonMatchingHorse = createMockHorse({ id: "no-match", stableId: "stable-2" });
    const race = createMockRace({ id: "race-1", day: 105 });
    const strategy = generateMultiRaceStrategy(
      state,
      stable,
      [matchingHorse, nonMatchingHorse],
      [race],
      100,
      20,
    );
    if (strategy["race-1"]) {
      expect(strategy["race-1"]).toContain("match");
      expect(strategy["race-1"]).not.toContain("no-match");
    }
  });

  it("max 2 horses per race", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createRaceEntryAIState(stable);
    const horses = Array.from({ length: 5 }, (_, i) =>
      createMockHorse({ id: `h-${i}`, stableId: "stable-1" }),
    );
    const race = createMockRace({ id: "race-1", day: 105 });
    const strategy = generateMultiRaceStrategy(state, stable, horses, [race], 100, 20);
    if (strategy["race-1"]) {
      expect(strategy["race-1"].length).toBeLessThanOrEqual(2);
    }
  });

  it("returns empty object when no upcoming races", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const strategy = generateMultiRaceStrategy(state, stable, [horse], [], 100, 20);
    expect(strategy).toEqual({});
  });

  it("returns empty object when no horses match stableId", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse({ stableId: "stable-2" });
    const race = createMockRace({ id: "race-1", day: 105 });
    const strategy = generateMultiRaceStrategy(state, stable, [horse], [race], 100, 20);
    expect(strategy).toEqual({});
  });
});

describe("adaptStrategy", () => {
  it("returns state unchanged with < 10 outcomes", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const newState = adaptStrategy(state, 100);
    expect(newState).toBe(state);
  });

  it("returns state unchanged with 0 outcomes (defaults to 0.5 successRate)", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const newState = adaptStrategy(state, 100);
    expect(newState).toBe(state);
  });

  it("BUG: adaptStrategy reads aiState.learningState but recordRaceEntryOutcome only writes to personalityState.learningState", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    // Record 11 failed outcomes
    let currentState = state;
    for (let i = 0; i < 11; i++) {
      currentState = recordRaceEntryOutcome(currentState, horse, race, i + 1, false, undefined);
    }

    // BUG: recordRaceEntryOutcome only updates personalityState.learningState,
    // but adaptStrategy reads from aiState.learningState.outcomes which stays empty.
    // So adaptStrategy sees 0 outcomes and returns unchanged state.
    const originalConfidence = currentState.personalityState.strategyConfidence;
    const newState = adaptStrategy(currentState, 100);
    expect(newState.personalityState.strategyConfidence).toBe(originalConfidence);
    expect(newState).toBe(currentState); // Unchanged because learningState.outcomes is empty
  });

  it("BUG: does not reduce strategyConfidence below 0.3 (never triggers due to learningState bug)", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    let currentState = state;
    for (let i = 0; i < 11; i++) {
      currentState = recordRaceEntryOutcome(currentState, horse, race, i + 1, false, undefined);
    }

    // Manually set confidence near floor
    currentState = {
      ...currentState,
      personalityState: {
        ...currentState.personalityState,
        strategyConfidence: 0.32,
      },
    };

    // BUG: adaptStrategy reads aiState.learningState.outcomes which is empty,
    // so it never triggers the confidence reduction.
    const newState = adaptStrategy(currentState, 100);
    expect(newState.personalityState.strategyConfidence).toBe(0.32);
  });

  it("returns unchanged when > 10 outcomes but successRate >= 0.4", () => {
    const stable = createMockStable();
    const state = createRaceEntryAIState(stable);
    const horse = createMockHorse();
    const race = createMockRace();

    // Record 11 successful outcomes (successRate = 1.0)
    let currentState = state;
    for (let i = 0; i < 11; i++) {
      currentState = recordRaceEntryOutcome(currentState, horse, race, i + 1, true, 1);
    }

    const newState = adaptStrategy(currentState, 100);
    expect(newState).toBe(currentState);
  });
});
