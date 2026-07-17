import { describe, it, expect } from "vitest";
import {
  getReputationTier,
  calculateRaceWinReputation,
  calculateRaceLossReputation,
  calculateBreedingReputation,
  formatReputationTier,
} from "@/core/reputation/reputationTypes";

describe("reputationTypes", () => {
  describe("getReputationTier", () => {
    it("returns correct tiers based on score thresholds", () => {
      expect(getReputationTier(0)).toBe("unknown");
      expect(getReputationTier(149)).toBe("unknown");
      expect(getReputationTier(150)).toBe("local");
      expect(getReputationTier(299)).toBe("local");
      expect(getReputationTier(300)).toBe("regional");
      expect(getReputationTier(450)).toBe("national");
      expect(getReputationTier(600)).toBe("international");
      expect(getReputationTier(750)).toBe("world_class");
      expect(getReputationTier(900)).toBe("legendary");
      expect(getReputationTier(1000)).toBe("legendary");
    });
  });

  describe("calculateRaceWinReputation", () => {
    it("calculates base reputation with purse bonus for non-graded races", () => {
      // 10 base + Math.floor(100000 / 50000) = 12
      expect(calculateRaceWinReputation(undefined, 100000)).toBe(12);
    });

    it("caps purse bonus at 20", () => {
      // 10 base + Math.min(20, Math.floor(2000000 / 50000)) = 10 + 20 = 30
      expect(calculateRaceWinReputation(undefined, 2000000)).toBe(30);
    });

    it("adds correct bonuses for graded stakes", () => {
      expect(calculateRaceWinReputation("G1", 0)).toBe(60); // 10 + 50
      expect(calculateRaceWinReputation("G2", 0)).toBe(45); // 10 + 35
      expect(calculateRaceWinReputation("G3", 0)).toBe(35); // 10 + 25
      expect(calculateRaceWinReputation("Listed", 0)).toBe(25); // 10 + 15
    });
  });

  describe("calculateRaceLossReputation", () => {
    it("calculates zero loss for non-graded races", () => {
      expect(calculateRaceLossReputation(undefined, 10, 10, 0)).toBe(0);
    });

    it("calculates last-place penalty in graded stakes", () => {
      expect(calculateRaceLossReputation("G1", 10, 10, 0)).toBe(-15);
      expect(calculateRaceLossReputation("G2", 8, 8, 0)).toBe(-12);
      expect(calculateRaceLossReputation("G3", 12, 12, 0)).toBe(-10);
      expect(calculateRaceLossReputation("Listed", 6, 6, 0)).toBe(-8);
    });

    it("calculates poor finish penalty (outside top half) in graded stakes", () => {
      // Not last place, but bottom half
      expect(calculateRaceLossReputation("G1", 6, 10, 0)).toBe(-10);
      expect(calculateRaceLossReputation("G2", 5, 8, 0)).toBe(-8);
      expect(calculateRaceLossReputation("G3", 7, 12, 0)).toBe(-6);
      expect(calculateRaceLossReputation("Listed", 4, 6, 0)).toBe(0); // No poor finish penalty for Listed
    });

    it("applies maximum penalty when multiple conditions met", () => {
      // Last place (-15) AND poor finish (-10), takes minimum (most negative)
      expect(calculateRaceLossReputation("G1", 10, 10, 0)).toBe(-15);
    });

    it("adds slump penalty for consecutive losses", () => {
      // -10 poor finish penalty + -5 slump penalty = -15
      expect(calculateRaceLossReputation("G1", 6, 10, 3)).toBe(-15);

      // 0 penalty + -5 slump penalty = -5
      expect(calculateRaceLossReputation(undefined, 5, 10, 4)).toBe(-5);
    });
  });

  describe("calculateBreedingReputation", () => {
    it("scales quality score down by factor of 5", () => {
      expect(calculateBreedingReputation(0)).toBe(0);
      expect(calculateBreedingReputation(10)).toBe(2);
      expect(calculateBreedingReputation(99)).toBe(19); // Math.floor(99 / 5)
      expect(calculateBreedingReputation(100)).toBe(20);
    });
  });

  describe("formatReputationTier", () => {
    it("formats known tiers correctly", () => {
      expect(formatReputationTier("unknown")).toBe("Unranked");
      expect(formatReputationTier("local")).toBe("Local");
      expect(formatReputationTier("world_class")).toBe("World Class");
    });
  });
});
