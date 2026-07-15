import { describe, it, expect } from "vitest";
import {
  createHorseGenAIState,
  calculateAgeGenerationPriority,
  calculateQualityGenerationPriority,
  shouldGenerateHorseOfAge,
  updateRosterComposition,
  recordHorseGeneration,
  recordHorseCareerOutcome,
  getGenerationInsights,
} from "@/core/ai/horseGenAI";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { StablePersonality } from "@/core/stable/types";
import type { Horse, Stable } from "@/game/types";

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
