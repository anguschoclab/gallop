import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateDosageProfile,
  calculateDosageIndex,
  calculateCenterOfDistribution,
  calculateDosageMetrics,
  interpretDosageIndex,
} from "@/core/race/dosage";
import type { DosageMetrics } from "@/core/breeding/types";
import * as pedigreeData from "@/data/pedigreeData";

describe("Dosage Calculations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("calculateDosageProfile", () => {
    it("should calculate points correctly for single and dual groups across generations", () => {
      vi.spyOn(pedigreeData, "findHorseByName").mockImplementation((name) => {
        if (name === "Sire1") return { name: "Sire1", dosageGroups: ["Brilliant"] } as any;
        if (name === "Grandsire")
          return { name: "Grandsire", dosageGroups: ["Classic", "Solid"] } as any;
        if (name === "GreatGrandsire")
          return { name: "GreatGrandsire", dosageGroups: ["Professional"] } as any;
        return undefined;
      });

      const pedigree = [
        { name: "Sire1", generation: 1 },
        { name: "Grandsire", generation: 2 },
        { name: "GreatGrandsire", generation: 3 },
        { name: "Unknown", generation: 4 },
      ];

      const profile = calculateDosageProfile(pedigree);

      expect(profile).toEqual({
        brilliant: 16,
        intermediate: 0,
        classic: 4,
        solid: 4,
        professional: 4,
      });
    });

    it("should handle empty pedigree", () => {
      const profile = calculateDosageProfile([]);
      expect(profile).toEqual({
        brilliant: 0,
        intermediate: 0,
        classic: 0,
        solid: 0,
        professional: 0,
      });
    });
  });

  describe("calculateDosageIndex", () => {
    it("should calculate dosage index correctly", () => {
      const profile = { brilliant: 16, intermediate: 0, classic: 14, solid: 0, professional: 0 };
      expect(calculateDosageIndex(profile)).toBe(3.29);
    });

    it("should return Infinity when denominator is 0", () => {
      const profile = { brilliant: 10, intermediate: 5, classic: 0, solid: 0, professional: 0 };
      expect(calculateDosageIndex(profile)).toBe(Infinity);
    });
  });

  describe("calculateCenterOfDistribution", () => {
    it("should calculate center of distribution correctly", () => {
      const profile = { brilliant: 16, intermediate: 0, classic: 14, solid: 0, professional: 0 };
      expect(calculateCenterOfDistribution(profile)).toBe(1.07);
    });

    it("should return 0 when total points is 0", () => {
      const profile = { brilliant: 0, intermediate: 0, classic: 0, solid: 0, professional: 0 };
      expect(calculateCenterOfDistribution(profile)).toBe(0);
    });
  });

  describe("calculateDosageMetrics", () => {
    it("should calculate full metrics and use cache", () => {
      const mockFindHorse = vi.spyOn(pedigreeData, "findHorseByName").mockImplementation((name) => {
        if (name === "SireA")
          return { name: "SireA", sire: "SireB", dosageGroups: ["Classic"] } as any;
        if (name === "SireB") return { name: "SireB", dosageGroups: ["Brilliant"] } as any;
        return undefined;
      });

      const result1 = calculateDosageMetrics("SireA");

      expect(result1.pedigree).toEqual([
        { name: "SireA", generation: 1 },
        { name: "SireB", generation: 2 },
      ]);
      expect(result1.dosageProfile).toEqual({
        brilliant: 8,
        intermediate: 0,
        classic: 16,
        solid: 0,
        professional: 0,
      });
      expect(result1.dosageIndex).toBe(2.0);
      expect(result1.centerOfDistribution).toBe(0.67);

      mockFindHorse.mockClear();
      const result2 = calculateDosageMetrics("SireA");

      expect(result2).toBe(result1);
      expect(mockFindHorse).not.toHaveBeenCalled();
    });

    it("should handle undefined sire", () => {
      const result = calculateDosageMetrics(undefined);
      expect(result.pedigree).toEqual([]);
      expect(result.dosageIndex).toBe(1.0);
      expect(result.dosageProfile.brilliant).toBe(0);
    });
  });

  describe("DosageMetrics type", () => {
    it("should export DosageMetrics interface and calculateDosageMetrics should return it", () => {
      // This test validates that the DosageMetrics interface exists and
      // calculateDosageMetrics returns a value conforming to it.
      const result: DosageMetrics = calculateDosageMetrics(undefined);
      expect(result.pedigree).toEqual([]);
      expect(result.dosageProfile).toBeDefined();
      expect(typeof result.dosageIndex).toBe("number");
      expect(typeof result.centerOfDistribution).toBe("number");
    });
  });

  describe("interpretDosageIndex", () => {
    it("should interpret various index ranges correctly", () => {
      expect(interpretDosageIndex(Infinity)).toBe(
        "Extreme speed preference (very short distances)",
      );
      expect(interpretDosageIndex(undefined)).toBe(
        "Extreme speed preference (very short distances)",
      );
      expect(interpretDosageIndex(4.5)).toBe("High speed preference (short to medium distances)");
      expect(interpretDosageIndex(3.0)).toBe(
        "Above-average speed preference (short to medium distances)",
      );
      expect(interpretDosageIndex(2.4)).toBe("Balanced speed and stamina (medium distances)");
      expect(interpretDosageIndex(1.5)).toBe("Above-average stamina (medium to long distances)");
      expect(interpretDosageIndex(1.0)).toBe("High stamina preference (long distances)");
    });
  });
});
