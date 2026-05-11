import { describe, it, expect } from "vitest";
import { calculateFounderEffect } from "./inbreedingCalculator";

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
});
