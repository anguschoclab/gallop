import { describe, it, expect } from "vitest";
import {
  calculateGeneticDistance,
  updateProgramProgress,
  createBreedingProgram,
} from "@/core/breeding/programs";
import { ORIGINAL_ARCHETYPES } from "@/core/breeding/archetypes";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Archetype } from "@/core/breeding/archetypes";

describe("programs", () => {
  describe("calculateGeneticDistance", () => {
    it("returns 0 for a perfect match", () => {
      const archetype = ORIGINAL_ARCHETYPES[0];
      const horse = createTestHorse({
        stats: {
          speed: archetype.targetPhenotype.speed * 100,
          stamina: archetype.targetPhenotype.stamina * 100,
          acceleration: archetype.targetPhenotype.acceleration * 100,
          consistency: archetype.targetPhenotype.consistency * 100,
          temperament: 50,
          conformation: 50,
        },
      });

      const distance = calculateGeneticDistance(horse, archetype);
      expect(distance).toBe(0);
    });

    it("calculates distance properly and uses weights", () => {
      const archetype: Archetype = {
        ...ORIGINAL_ARCHETYPES[0],
        targetPhenotype: {
          ...ORIGINAL_ARCHETYPES[0].targetPhenotype,
          speed: 1.0,
          stamina: 1.0,
          acceleration: 1.0,
          consistency: 1.0,
        },
        weights: {
          speed: 1, // Only speed matters
          stamina: 0,
          acceleration: 0,
          consistency: 0,
        },
      };

      const horse = createTestHorse({
        stats: {
          speed: 50, // 0.5 away
          stamina: 0, // Ignored
          acceleration: 0, // Ignored
          consistency: 0, // Ignored
          temperament: 0,
          conformation: 0,
        },
      });

      const distance = calculateGeneticDistance(horse, archetype);
      expect(distance).toBe(0.5);
    });
  });

  describe("updateProgramProgress", () => {
    it("updates progress and hits milestones correctly", () => {
      const archetype = ORIGINAL_ARCHETYPES[0];
      const program = createBreedingProgram("stable1", archetype.id, 10);
      program.generationCount = 1; // It was 0 initially!

      const goodHorse = createTestHorse({
        id: "horse1",
        stats: {
          speed: archetype.targetPhenotype.speed * 100,
          stamina: archetype.targetPhenotype.stamina * 100,
          acceleration: archetype.targetPhenotype.acceleration * 100,
          consistency: archetype.targetPhenotype.consistency * 100,
          temperament: 50,
          conformation: 50,
        },
      });

      const updated = updateProgramProgress(program, goodHorse, archetype, 20);

      expect(updated.generationCount).toBe(2); // Because it increments!
      expect(updated.bestHorseId).toBe("horse1");
      expect(updated.geneticDistance).toBe(0);
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0]).toEqual({ day: 20, distance: 0, horseId: "horse1" });

      // Check milestones
      const firstGenMilestone = updated.milestones.find(
        (m) => m.triggerCondition === "first_generation",
      );
      expect(firstGenMilestone?.achieved).toBe(true);

      const below0_2Milestone = updated.milestones.find(
        (m) => m.triggerCondition === "distance_below_0.2",
      );
      expect(below0_2Milestone?.achieved).toBe(true);
    });

    it("preserves achieved milestones across updates", () => {
      const archetype = ORIGINAL_ARCHETYPES[0];
      const program = createBreedingProgram("stable1", archetype.id, 10);

      // Manually set a milestone to achieved
      program.milestones[0].achieved = true;
      program.milestones[0].achievedDay = 15;

      const goodHorse = createTestHorse({ id: "horse1" });
      const updated = updateProgramProgress(program, goodHorse, archetype, 20);

      expect(updated.milestones[0].achieved).toBe(true);
      expect(updated.milestones[0].achievedDay).toBe(15);
    });
  });
});
