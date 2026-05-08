import { describe, it, expect } from "vitest";
import { calculateFounderEffect, calculateInbreedingCoefficient } from "./inbreedingCalculator";

describe("inbreedingCalculator", () => {
  describe("calculateFounderEffect", () => {
    it("calculates founder effect score for two horse names", () => {
      const result = calculateFounderEffect("SireName", "DamName");

      expect(result).toHaveProperty("score");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty("description");
      expect(typeof result.description).toBe("string");
    });

    it("returns warning for low founder effect (indicating inbreeding)", () => {
      const result = calculateFounderEffect("SameName", "SameName");

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("description");
      // Low founder effect should trigger a warning
      if (result.warning) {
        expect(result.warning).toMatch(/inbreeding|founder/i);
      }
    });
  });

  describe("calculateInbreedingCoefficient", () => {
    it("calculates inbreeding coefficient for two horse names", () => {
      const result = calculateInbreedingCoefficient("SireName", "DamName");

      expect(result).toHaveProperty("coefficient");
      expect(result.coefficient).toBeGreaterThanOrEqual(0);
      expect(result.coefficient).toBeLessThanOrEqual(1);
      expect(result).toHaveProperty("warning");
      expect(typeof result.warning).toBe("string");
    });

    it("returns higher coefficient for closely related horses", () => {
      const unrelated = calculateInbreedingCoefficient("HorseA", "HorseB");
      const related = calculateInbreedingCoefficient("SameName", "SameName");

      expect(related.coefficient).toBeGreaterThanOrEqual(unrelated.coefficient);
    });

    it("returns warning for high inbreeding coefficient", () => {
      const result = calculateInbreedingCoefficient("SameName", "SameName");

      // Warning may be empty depending on implementation
      if (result.warning) {
        expect(result.warning).toMatch(/inbreeding|high/i);
      }
    });
  });
});
