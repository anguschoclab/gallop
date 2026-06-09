import { describe, it, expect } from "vitest";
import {
  calculateImpulse,
  decayValue,
  calculatePeakingIndex,
  getPeakingBeyerMultiplier,
} from "@/core/health/banister";

describe("banister health model", () => {
  describe("calculateImpulse", () => {
    it("calculates the correct impulse given intensity and k", () => {
      expect(calculateImpulse(10, 0.5)).toBe(5);
      expect(calculateImpulse(0, 0.5)).toBe(0);
      expect(calculateImpulse(10, 0)).toBe(0);
      expect(calculateImpulse(100, 1.2)).toBe(120);
    });
  });

  describe("decayValue", () => {
    it("calculates the correct decayed value given current value and tau", () => {
      // V_new = V_old * exp(-1 / tau)

      const val1 = decayValue(100, 1);
      // Math.exp(-1) is approx 0.367879
      expect(val1).toBeCloseTo(36.7879, 4);

      const val2 = decayValue(100, 10);
      // Math.exp(-0.1) is approx 0.904837
      expect(val2).toBeCloseTo(90.4837, 4);

      expect(decayValue(0, 10)).toBe(0);
    });
  });

  describe("calculatePeakingIndex", () => {
    it("calculates correct form (fitness - fatigue)", () => {
      expect(calculatePeakingIndex(100, 50)).toBe(50);
      expect(calculatePeakingIndex(50, 100)).toBe(-50);
      expect(calculatePeakingIndex(0, 0)).toBe(0);
    });
  });

  describe("getPeakingBeyerMultiplier", () => {
    it("returns correct multipliers based on peaking index thresholds", () => {
      // > 20
      expect(getPeakingBeyerMultiplier(21)).toBe(1.05);
      expect(getPeakingBeyerMultiplier(100)).toBe(1.05);

      // > 0 and <= 20
      expect(getPeakingBeyerMultiplier(20)).toBe(1.02);
      expect(getPeakingBeyerMultiplier(1)).toBe(1.02);

      // > -10 and <= 0
      expect(getPeakingBeyerMultiplier(0)).toBe(1.0);
      expect(getPeakingBeyerMultiplier(-9)).toBe(1.0);

      // > -30 and <= -10
      expect(getPeakingBeyerMultiplier(-10)).toBe(0.95);
      expect(getPeakingBeyerMultiplier(-29)).toBe(0.95);

      // <= -30
      expect(getPeakingBeyerMultiplier(-30)).toBe(0.9);
      expect(getPeakingBeyerMultiplier(-50)).toBe(0.9);
    });
  });
});
