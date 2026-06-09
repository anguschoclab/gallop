import { describe, it, expect } from "vitest";
import {
  decayValue,
  calculateImpulse,
  calculatePeakingIndex,
  getPeakingBeyerMultiplier,
} from "@/core/health/banister";

describe("banister health model", () => {
  describe("decayValue", () => {
    it("should return the initial value when days passed is 0", () => {
      expect(decayValue(100, 0, 10)).toBe(100);
    });

    it("should decay correctly over multiple days", () => {
      // For 5 days, tau = 10, exp(-5/10) = exp(-0.5) = 0.6065306597126334
      const result = decayValue(100, 5, 10);
      expect(result).toBeCloseTo(60.653, 3);
    });

    it("should return 0 when currentValue is 0", () => {
      expect(decayValue(0, 1, 10)).toBe(0);
    });

    it("should correctly calculate exponential decay for 1 day", () => {
      // For tau = 10, exp(-1/10) = 0.9048374180359595
      const result = decayValue(100, 1, 10);
      expect(result).toBeCloseTo(90.4837, 4);
    });

    it("should handle large tau (decay approaches 0)", () => {
      const result = decayValue(100, 1, 10000);
      expect(result).toBeCloseTo(99.99, 2);
    });

    it("should return currentValue when tau is Infinity", () => {
      expect(decayValue(100, 1, Infinity)).toBe(100);
    });

    it("should decay faster with smaller tau", () => {
      const slowDecay = decayValue(100, 1, 20);
      const fastDecay = decayValue(100, 1, 5);
      expect(fastDecay).toBeLessThan(slowDecay);
    });
  });

  describe("calculateImpulse", () => {
    it("should multiply intensity by k", () => {
      expect(calculateImpulse(5, 10)).toBe(50);
      expect(calculateImpulse(0, 10)).toBe(0);
    });
  });

  describe("calculatePeakingIndex", () => {
    it("should return fitness minus fatigue", () => {
      expect(calculatePeakingIndex(100, 20)).toBe(80);
      expect(calculatePeakingIndex(50, 70)).toBe(-20);
    });
  });

  describe("getPeakingBeyerMultiplier", () => {
    it("should return 1.05 for peakingIndex > 20", () => {
      expect(getPeakingBeyerMultiplier(21)).toBe(1.05);
      expect(getPeakingBeyerMultiplier(100)).toBe(1.05);
    });

    it("should return 1.02 for peakingIndex > 0 and <= 20", () => {
      expect(getPeakingBeyerMultiplier(20)).toBe(1.02);
      expect(getPeakingBeyerMultiplier(1)).toBe(1.02);
    });

    it("should return 1.0 for peakingIndex > -10 and <= 0", () => {
      expect(getPeakingBeyerMultiplier(0)).toBe(1.0);
      expect(getPeakingBeyerMultiplier(-9)).toBe(1.0);
    });

    it("should return 0.95 for peakingIndex > -30 and <= -10", () => {
      expect(getPeakingBeyerMultiplier(-10)).toBe(0.95);
      expect(getPeakingBeyerMultiplier(-29)).toBe(0.95);
    });

    it("should return 0.9 for peakingIndex <= -30", () => {
      expect(getPeakingBeyerMultiplier(-30)).toBe(0.9);
      expect(getPeakingBeyerMultiplier(-50)).toBe(0.9);
    });
  });
});
