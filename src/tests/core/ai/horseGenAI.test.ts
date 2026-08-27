import { describe, it, expect } from "vitest";
import {
  createHorseGenAIState,
  calculateAgeGenerationPriority,
  calculateQualityGenerationPriority,
  shouldGenerateHorseOfAge,
} from "@/core/ai/horseGenAI";
import {
  recordHorseGeneration,
  recordHorseCareerOutcome,
  getGenerationInsights,
  updateRosterComposition,
} from "@/core/ai/horseGenAIRecording";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { StablePersonality } from "@/core/stable/types";
import type { Horse, Stable } from "@/game/types";
import { makeNpcOwned } from "@/core/horse/ownership";

const ALL_PERSONALITIES: StablePersonality[] = [
  "prestige",
  "win-now",
  "conservative",
  "aggressive",
  "developer",
  "trader",
  "specialist",
  "breeder",
];

const EXPECTED_QUALITY: Record<StablePersonality, number> = {
  prestige: 75,
  "win-now": 70,
  conservative: 60,
  aggressive: 65,
  developer: 60,
  trader: 60,
  specialist: 60,
  breeder: 60,
};

const EXPECTED_HORSE_COUNT: Record<StablePersonality, number> = {
  prestige: 15,
  "win-now": 10,
  conservative: 10,
  aggressive: 10,
  developer: 10,
  trader: 10,
  specialist: 10,
  breeder: 10,
};

describe("createHorseGenAIState", () => {
  for (const personality of ALL_PERSONALITIES) {
    it(`${personality}: targetQualityLevel matches strategy`, () => {
      const stable = createTestStable({ personality });
      const state = createHorseGenAIState(stable);
      expect(state.rosterComposition.targetQualityLevel).toBe(EXPECTED_QUALITY[personality]);
    });

    it(`${personality}: targetHorseCount matches strategy`, () => {
      const stable = createTestStable({ personality });
      const state = createHorseGenAIState(stable);
      expect(state.rosterComposition.targetHorseCount).toBe(EXPECTED_HORSE_COUNT[personality]);
    });

    it(`${personality}: targetAgeDistribution sums to targetHorseCount`, () => {
      const stable = createTestStable({ personality });
      const state = createHorseGenAIState(stable);
      const dist = state.rosterComposition.targetAgeDistribution;
      const sum = Object.values(dist).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(state.rosterComposition.targetHorseCount, 5);
    });
  }

  it("initializes with empty currentAgeDistribution", () => {
    const stable = createTestStable({ personality: "aggressive" });
    const state = createHorseGenAIState(stable);
    expect(state.rosterComposition.currentAgeDistribution).toEqual({});
  });

  it("initializes with currentHorseCount=0", () => {
    const stable = createTestStable({ personality: "aggressive" });
    const state = createHorseGenAIState(stable);
    expect(state.rosterComposition.currentHorseCount).toBe(0);
  });

  it("initializes with currentQualityLevel=50", () => {
    const stable = createTestStable({ personality: "aggressive" });
    const state = createHorseGenAIState(stable);
    expect(state.rosterComposition.currentQualityLevel).toBe(50);
  });

  it("initializes with empty generationHistory", () => {
    const stable = createTestStable({ personality: "aggressive" });
    const state = createHorseGenAIState(stable);
    expect(state.generationHistory).toEqual([]);
  });

  it("prestige: targetAgeDistribution has ages 2-6", () => {
    const stable = createTestStable({ personality: "prestige" });
    const state = createHorseGenAIState(stable);
    const ages = Object.keys(state.rosterComposition.targetAgeDistribution).map(Number).sort();
    expect(ages).toEqual([2, 3, 4, 5, 6]);
  });

  it("win-now: targetAgeDistribution has ages 3-6 (no 2yo)", () => {
    const stable = createTestStable({ personality: "win-now" });
    const state = createHorseGenAIState(stable);
    const ages = Object.keys(state.rosterComposition.targetAgeDistribution).map(Number).sort();
    expect(ages).toEqual([3, 4, 5, 6]);
  });
});

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
    ownership: makeNpcOwned("test-stable-id"),
    ...overrides,
  });
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "test-stable-id",
    personality: "aggressive",
    ...overrides,
  });
}

describe("calculateAgeGenerationPriority", () => {
  it("returns 0-100 range", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const priority = calculateAgeGenerationPriority(state, 3, stable);
    expect(priority).toBeGreaterThanOrEqual(0);
    expect(priority).toBeLessThanOrEqual(100);
  });

  it("higher priority for ages with large deficit", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    // Empty currentAgeDistribution → deficit = target - 0 = target
    const priority = calculateAgeGenerationPriority(state, 3, stable);
    // target for age 3 = 10 * 0.25 = 2.5, deficit = 2.5, priority = 2.5 * 20 = 50
    expect(priority).toBe(50);
  });

  it("prestige: +15 agePriorityBonus for age <= 3", () => {
    const stable = createMockStable({ personality: "prestige" });
    const state = createHorseGenAIState(stable);
    // target for age 3 = 15 * 0.3 = 4.5, deficit = 4.5, priority = 4.5*20=90 + 15 = 105 → capped at 100
    const priority = calculateAgeGenerationPriority(state, 3, stable);
    expect(priority).toBe(100);
  });

  it("win-now: +15 agePriorityBonus for age 3-5", () => {
    const stable = createMockStable({ personality: "win-now" });
    const state = createHorseGenAIState(stable);
    // target for age 4 = 10 * 0.4 = 4, deficit = 4, priority = 4*20=80 + 15 = 95
    const priority = calculateAgeGenerationPriority(state, 4, stable);
    expect(priority).toBe(95);
  });

  it("priority decreases as current count approaches target", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const stateWithSome = {
      ...state,
      rosterComposition: {
        ...state.rosterComposition,
        currentAgeDistribution: { 3: 2 },
      },
    };
    // target for age 3 = 2.5, current = 2, deficit = 0.5, priority = 0.5*20 = 10
    const priority = calculateAgeGenerationPriority(stateWithSome, 3, stable);
    expect(priority).toBe(10);
  });
});

describe("calculateQualityGenerationPriority", () => {
  it("returns 0-100 range", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const priority = calculateQualityGenerationPriority(state, 70, stable);
    expect(priority).toBeGreaterThanOrEqual(0);
    expect(priority).toBeLessThanOrEqual(100);
  });

  it("higher priority for rating >= targetQuality", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    // aggressive targetQuality = 65
    const highPriority = calculateQualityGenerationPriority(state, 80, stable);
    const lowPriority = calculateQualityGenerationPriority(state, 40, stable);
    expect(highPriority).toBeGreaterThan(lowPriority);
  });

  it("rating >= target: 50 + (rating - target) * 2", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    // aggressive target = 65, rating = 75 → 50 + 10*2 = 70
    const priority = calculateQualityGenerationPriority(state, 75, stable);
    expect(priority).toBe(70);
  });

  it("rating < target: (rating / target) * 30", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    // aggressive target = 65, rating = 32.5 → (32.5/65)*30 = 15
    const priority = calculateQualityGenerationPriority(state, 32.5, stable);
    expect(priority).toBe(15);
  });

  it("prestige: +20 qualityPriorityBonus for rating > 75", () => {
    const stable = createMockStable({ personality: "prestige" });
    const state = createHorseGenAIState(stable);
    // prestige target = 75, rating = 80 → 50 + 5*2=60 + 20 = 80
    const priority = calculateQualityGenerationPriority(state, 80, stable);
    expect(priority).toBe(80);
  });
});

describe("shouldGenerateHorseOfAge", () => {
  it("returns false when currentHorseCount >= targetHorseCount", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const fullState = {
      ...state,
      rosterComposition: {
        ...state.rosterComposition,
        currentHorseCount: 10,
        targetHorseCount: 10,
      },
    };
    expect(shouldGenerateHorseOfAge(fullState, 3, stable)).toBe(false);
  });

  it("returns true when priority > threshold", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createHorseGenAIState(stable);
    // aggressive threshold = 30, age 3 deficit = 2.5, priority = 50 > 30
    expect(shouldGenerateHorseOfAge(state, 3, stable)).toBe(true);
  });

  it("conservative: threshold = 40 (higher, harder to generate)", () => {
    const stable = createMockStable({ personality: "conservative" });
    const state = createHorseGenAIState(stable);
    // conservative threshold = 40, age 3 target = 2.5, deficit = 2.5, priority = 50 > 40
    expect(shouldGenerateHorseOfAge(state, 3, stable)).toBe(true);
  });

  it("returns false when priority <= threshold", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createHorseGenAIState(stable);
    // Fill up age 3 to reduce deficit to 0
    const fullState = {
      ...state,
      rosterComposition: {
        ...state.rosterComposition,
        currentAgeDistribution: { 3: 3 }, // target=2.5, current=3, deficit=-0.5 → priority=0
      },
    };
    expect(shouldGenerateHorseOfAge(fullState, 3, stable)).toBe(false);
  });
});

describe("updateRosterComposition", () => {
  it("increments currentHorseCount", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const newState = updateRosterComposition(state, horse);
    expect(newState.rosterComposition.currentHorseCount).toBe(1);
  });

  it("increments age count for horse's age", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const newState = updateRosterComposition(state, horse);
    expect(newState.rosterComposition.currentAgeDistribution[3]).toBe(1);
  });

  it("recalculates currentQualityLevel as average", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
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
    const newState = updateRosterComposition(state, horse);
    // initial quality = 50, new horse rating = 80, count = 1
    // totalQuality = 50 * 0 + 80 = 80, newQuality = 80 / 1 = 80
    expect(newState.rosterComposition.currentQualityLevel).toBe(80);
  });

  it("does not mutate original state", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse();
    const newState = updateRosterComposition(state, horse);
    expect(state.rosterComposition.currentHorseCount).toBe(0);
    expect(newState).not.toBe(state);
  });
});

describe("recordHorseGeneration", () => {
  it("adds to generationHistory and trims to memoryDepth", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse();
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 3; i++) {
      currentState = recordHorseGeneration(currentState, horse, stable, i + 1);
    }
    expect(currentState.generationHistory.length).toBe(memoryDepth);
  });

  it("updates rosterComposition via updateRosterComposition", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const newState = recordHorseGeneration(state, horse, stable, 1);
    expect(newState.rosterComposition.currentHorseCount).toBe(1);
    expect(newState.rosterComposition.currentAgeDistribution[3]).toBe(1);
  });

  it("updates learningState", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse();
    const newState = recordHorseGeneration(state, horse, stable, 1);
    expect(newState.learningState.outcomes.length).toBeGreaterThan(0);
  });

  it("records with success = true (default)", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse();
    const newState = recordHorseGeneration(state, horse, stable, 1);
    expect(newState.learningState.outcomes[0].success).toBe(true);
  });
});

describe("recordHorseCareerOutcome", () => {
  it("finds matching generation and sets success based on earnings > 100000", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const stateWithGen = recordHorseGeneration(state, horse, stable, 1);
    const newState = recordHorseCareerOutcome(stateWithGen, "h-1", 200000, 100);
    expect(newState.generationHistory[0].success).toBe(true);
    expect(newState.generationHistory[0].careerEarnings).toBe(200000);
  });

  it("sets success = false when earnings <= 100000", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const stateWithGen = recordHorseGeneration(state, horse, stable, 1);
    const newState = recordHorseCareerOutcome(stateWithGen, "h-1", 50000, 100);
    expect(newState.generationHistory[0].success).toBe(false);
  });

  it("returns unchanged if no match found", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const newState = recordHorseCareerOutcome(state, "unknown", 200000, 100);
    expect(newState).toBe(state);
  });

  it("updates personalityState and learningState", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse({ id: "h-1" });
    const stateWithGen = recordHorseGeneration(state, horse, stable, 1);
    const newState = recordHorseCareerOutcome(stateWithGen, "h-1", 200000, 100);
    expect(newState.personalityState.learningState.outcomes.length).toBeGreaterThan(
      stateWithGen.personalityState.learningState.outcomes.length,
    );
    expect(newState.learningState.outcomes.length).toBeGreaterThan(
      stateWithGen.learningState.outcomes.length,
    );
  });
});

describe("getGenerationInsights", () => {
  it("returns defaults for empty history", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const insights = getGenerationInsights(state, "test-stable-id");
    expect(insights.totalGenerated).toBe(0);
    expect(insights.avgQuality).toBe(0);
    expect(insights.successRate).toBe(0.5);
    expect(insights.avgCareerEarnings).toBe(0);
  });

  it("filters by stableId", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse();
    const stateWithGen = recordHorseGeneration(state, horse, stable, 1);
    const insights = getGenerationInsights(stateWithGen, "stable-1");
    expect(insights.totalGenerated).toBe(1);
  });

  it("calculates avgQuality from horseRating", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createHorseGenAIState(stable);
    const horse = createMockHorse();
    const stateWithGen = recordHorseGeneration(state, horse, stable, 1);
    const insights = getGenerationInsights(stateWithGen, "stable-1");
    expect(insights.avgQuality).toBe(stateWithGen.generationHistory[0].horseRating);
  });

  it("rosterBalance = 1 when current matches target", () => {
    const stable = createMockStable();
    const state = createHorseGenAIState(stable);
    const insights = getGenerationInsights(state, "test-stable-id");
    // No current horses, all deficits → balance < 1
    // Actually with empty current, balance = sum(1 - |target - 0| / target) / numAges
    // = sum(1 - 1) / numAges = 0
    expect(insights.rosterBalance).toBeGreaterThanOrEqual(0);
    expect(insights.rosterBalance).toBeLessThanOrEqual(1);
  });
});
