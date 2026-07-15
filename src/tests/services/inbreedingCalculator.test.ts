import { describe, it, expect } from "vitest";
import {
  calculateFounderEffect,
  checkDirectInbreeding,
} from "@/services/breeding/inbreedingCalculator";
import { DEFAULT_GENETIC_DIVERSITY } from "@/constants";

describe("inbreedingCalculator", () => {
  describe("checkDirectInbreeding", () => {
    it("returns direct inbreeding when sireId and damId are identical", () => {
      const result = checkDirectInbreeding("same-id", "same-id", "Sire", "Dam");
      expect(result).not.toBeNull();
      expect(result?.description).toBe("Direct inbreeding detected");
      expect(result?.warning).toBe("Sire and dam are the same individual");
      expect(result?.score).toBe(0);
    });

    it("returns null when IDs are different, even with identical names", () => {
      const result = checkDirectInbreeding(
        "sire-id-1",
        "dam-id-1",
        "SharedName",
        "SharedName",
      );
      expect(result).toBeNull();
    });

    it("returns null when both names are Unknown placeholders", () => {
      const result = checkDirectInbreeding(undefined, undefined, "Unknown", "Unknown");
      expect(result).toBeNull();
    });

    it("returns null when only one name is present", () => {
      const result = checkDirectInbreeding(undefined, undefined, "KnownSire", "");
      expect(result).toBeNull();
    });

    it("falls back to name equality only when IDs are unavailable", () => {
      const result = checkDirectInbreeding(undefined, undefined, "SameName", "SameName");
      expect(result).not.toBeNull();
      expect(result?.description).toBe("Direct inbreeding detected");
      expect(result?.warning).toContain("identical names");
    });
  });

  describe("calculateFounderEffect", () => {
    it("calculates founder effect score for two known pedigree names", () => {
      const result = calculateFounderEffect("Northern Dancer", "Natalma");

      expect(result).toHaveProperty("score");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result).toHaveProperty("description");
      expect(typeof result.description).toBe("string");
    });

    it("returns unknown pedigree when either parent name is a placeholder", () => {
      expect(calculateFounderEffect("Unknown", "KnownDam")).toEqual({
        score: DEFAULT_GENETIC_DIVERSITY,
        description: "Unknown pedigree",
      });
      expect(calculateFounderEffect("KnownSire", "Unknown")).toEqual({
        score: DEFAULT_GENETIC_DIVERSITY,
        description: "Unknown pedigree",
      });
      expect(calculateFounderEffect("Unknown", "Unknown")).toEqual({
        score: DEFAULT_GENETIC_DIVERSITY,
        description: "Unknown pedigree",
      });
    });

    it("returns unknown pedigree when names are not in the curated dataset", () => {
      const result = calculateFounderEffect("SireName", "DamName");
      expect(result.score).toBe(DEFAULT_GENETIC_DIVERSITY);
      expect(result.description).toBe("Unknown pedigree");
    });

    it("does not return a direct-inbreeding warning from identical names", () => {
      const result = calculateFounderEffect("SameName", "SameName");
      expect(result.description).toBe("Unknown pedigree");
      expect(result.warning).toBeUndefined();
    });

    it("assigns a lower diversity score to pairs that share ancestors", () => {
      // Nearctic is Northern Dancer's sire, so this pair shares an entire ancestor set.
      const outcross = calculateFounderEffect("Northern Dancer", "Mr. Prospector");
      const linebreed = calculateFounderEffect("Northern Dancer", "Nearctic");
      expect(linebreed.score).toBeLessThanOrEqual(outcross.score);
      expect(linebreed.score).toBeGreaterThanOrEqual(0);
    });
  });
});
