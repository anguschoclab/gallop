import { describe, expect, it } from "vitest";
import {
  generateEnergyImpact,
  generateFormImpact,
  generateFameImpact,
} from "@/core/race/impacts/energyFormFame";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import { RACE_ENERGY_IMPACT } from "@/constants";
import type { StaffMember } from "@/core/staff/staffTypes";

describe("energyFormFame impacts", () => {
  const testHorse = createTestHorse({ id: "horse1" });
  const rng = createTestRng("test");

  describe("generateEnergyImpact", () => {
    it("should return correct energy drain amount", () => {
      const impact = generateEnergyImpact("horse1", 10, rng);
      expect(impact.type).toBe("energy_change");
      expect(impact.delta).toBe(RACE_ENERGY_IMPACT);
      expect(impact.horseId).toBe("horse1");
    });
  });

  describe("generateFormImpact", () => {
    const groomStaff: StaffMember = {
      id: "groom1",
      name: "Test Groom",
      role: "groom",
      stableId: "stable1",
      tier: "budget",
      salary: 100,
      bonusValue: 0.1,
      traits: [],
      fame: 0,
    };

    it("should grant maximum form for winning", () => {
      const impact = generateFormImpact(testHorse, 1, 10, [], rng);
      expect(impact.delta).toBe(3);
    });

    it("should decrease form for poor performance (6th+)", () => {
      const impact = generateFormImpact(testHorse, 6, 10, [], rng);
      expect(impact.delta).toBe(-1);
    });

    it("should prevent form decrease if stable employs a groom", () => {
      const horseWithStable = {
        ...testHorse,
        ownership: { type: "npc", stableId: asNpcStableId("stable1") },
      };
      const impact = generateFormImpact(horseWithStable, 6, 10, [groomStaff], rng);
      // Groom prevents form dropping below 0
      expect(impact.delta).toBe(0);
    });
  });

  describe("generateFameImpact", () => {
    it("should grant 2 fame for 1st place", () => {
      const impact = generateFameImpact(testHorse, 1, 10, rng);
      expect(impact).not.toBeNull();
      expect(impact?.delta).toBe(2);
    });

    it("should grant 0.5 fame for 2nd/3rd place", () => {
      const impact2 = generateFameImpact(testHorse, 2, 10, rng);
      const impact3 = generateFameImpact(testHorse, 3, 10, rng);
      expect(impact2?.delta).toBe(0.5);
      expect(impact3?.delta).toBe(0.5);
    });

    it("should grant no fame (return null) for 4th or worse", () => {
      const impact = generateFameImpact(testHorse, 4, 10, rng);
      expect(impact).toBeNull();
    });
  });
});
