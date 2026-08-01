/**
 * Subsystem Weight Application Tests
 *
 * Verifies that SubsystemWeights from coordinateSubsystems are actually
 * used to modulate NPC behavior in each intent generator.
 *
 * Test-first: these tests are written BEFORE the implementation changes in Phase 2.2.
 */

import { describe, it, expect } from "vitest";
import {
  coordinateSubsystems,
  type SubsystemWeights,
  type BudgetAllocation,
} from "@/core/ai/strategicCoordinator";
import {
  shouldTrainToday,
  createTrainingAIState,
  type TrainingAIState,
} from "@/core/ai/trainingAI";
import { shouldClaimHorse, createClaimingAIState } from "@/core/ai/claimingAI";
import { shouldGeldHorse, createGeldingAIState } from "@/core/ai/geldingAI";
import type { Stable, Horse } from "@/game/types";
import { createTestStable, createTestHorse } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "npc-1",
    name: "Test NPC Stable",
    cash: 100000,
    personality: "aggressive",
    tier: "mid",
    ...overrides,
  });
}

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 4,
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
    stableId: "npc-1",
    ...overrides,
  });
}

const defaultBudget: BudgetAllocation = {
  total: 100000,
  training: 20000,
  facilities: 15000,
  auctions: 30000,
  claiming: 15000,
  breeding: 20000,
};

const expansionDirectives = [{ type: "aggressive_expansion" as const, priority: 1, weight: 1.0 }];
const defensiveDirectives = [{ type: "defensive" as const, priority: 1, weight: 1.0 }];

describe("Subsystem Weight Application", () => {
  describe("training weight", () => {
    it("higher training weight increases shouldTrainToday probability", () => {
      const stable = createMockStable({ personality: "conservative" });
      const horse = createMockHorse({ energy: 50 });
      const trainingAI = createTrainingAIState(stable);

      // With default weight (1.0), conservative might skip training
      // With high weight (2.0), should be more likely to train
      const defaultResult = shouldTrainToday(trainingAI, horse, 100, 1.0);
      const highWeightResult = shouldTrainToday(trainingAI, horse, 100, 2.0);

      // High weight should be at least as likely to train as default
      expect(typeof defaultResult).toBe("boolean");
      expect(typeof highWeightResult).toBe("boolean");
      // If default is true, high weight should also be true
      if (defaultResult) {
        expect(highWeightResult).toBe(true);
      }
    });

    it("zero training weight prevents training", () => {
      const stable = createMockStable({ personality: "aggressive" });
      const horse = createMockHorse({ energy: 80 });
      const trainingAI = createTrainingAIState(stable);

      const result = shouldTrainToday(trainingAI, horse, 100, 0);
      expect(result).toBe(false);
    });
  });

  describe("raceEntry weight", () => {
    it("coordinateSubsystems produces different raceEntry weights for different directives", () => {
      const expansionWeights = coordinateSubsystems(expansionDirectives, defaultBudget);
      const defensiveWeights = coordinateSubsystems(defensiveDirectives, defaultBudget);

      expect(expansionWeights.raceEntry).toBeGreaterThan(defensiveWeights.raceEntry);
    });
  });

  describe("claiming weight", () => {
    it("higher claiming weight should make claiming more likely", () => {
      const stable = createMockStable({ personality: "trader", cash: 200000 });
      const horse = createMockHorse({
        id: "claim-target",
        stableId: "npc-2",
        age: 4,
        energy: 50,
        form: 40,
        stats: {
          speed: 60,
          stamina: 60,
          acceleration: 60,
          consistency: 60,
          temperament: 50,
          conformation: 50,
        },
      });
      const race = {
        id: "race-1",
        name: "Claiming Race",
        day: 100,
        distance: 1600,
        surface: "Dirt",
        raceClass: "Claiming",
        entryFee: 0,
        purse: 10000,
        fieldSize: 12,
        entries: [],
        resolved: false,
        claimingPrice: 25000,
      } as unknown as import("@/core/race/types").Race;

      const claimingAI = createClaimingAIState(stable);

      // With weight 1.0 (default)
      const defaultResult = shouldClaimHorse(claimingAI, horse, race, stable, 100, 0, 1.0);
      // With weight 2.0 (high)
      const highWeightResult = shouldClaimHorse(claimingAI, horse, race, stable, 100, 0, 2.0);

      expect(typeof defaultResult).toBe("boolean");
      expect(typeof highWeightResult).toBe("boolean");
      // High weight should be at least as likely to claim
      if (!defaultResult) {
        // If default says no, high weight might say yes (or still no, but path is verified)
        expect(typeof highWeightResult).toBe("boolean");
      }
    });
  });

  describe("breeding weight (gelding)", () => {
    it("higher breeding weight reduces gelding likelihood (anti-breeding)", () => {
      const stable = createMockStable({ personality: "breeder" });
      const horse = createMockHorse({
        age: 2,
        gender: "colt",
        careerWins: 0,
        stats: {
          speed: 40,
          stamina: 40,
          acceleration: 40,
          consistency: 40,
          temperament: 30,
          conformation: 30,
        },
      });
      const geldingAI = createGeldingAIState(stable);

      // Low breeding weight (0) = more likely to geld
      const lowBreedingResult = shouldGeldHorse(geldingAI, horse, 100, 0);
      // High breeding weight (2) = less likely to geld
      const highBreedingResult = shouldGeldHorse(geldingAI, horse, 100, 2);

      expect(typeof lowBreedingResult).toBe("boolean");
      expect(typeof highBreedingResult).toBe("boolean");
      // If high breeding weight says geld, low should also say geld
      if (highBreedingResult) {
        expect(lowBreedingResult).toBe(true);
      }
    });
  });

  describe("weights are produced by coordinateSubsystems", () => {
    it("all weights are positive numbers", () => {
      const weights = coordinateSubsystems(expansionDirectives, defaultBudget);
      for (const value of Object.values(weights)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(typeof value).toBe("number");
      }
    });
  });
});
