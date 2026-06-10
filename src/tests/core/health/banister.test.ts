import { describe, it, expect } from "vitest";
import {
  decayValue,
  calculateImpulse,
  calculatePeakingIndex,
  getPeakingBeyerMultiplier,
  BANISTER_CONSTANTS,
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

    it("should return 0 when initialValue is 0", () => {
      expect(decayValue(0, 1, 10)).toBe(0);
    });

    it("should correctly calculate exponential decay for 1 day", () => {
      // For tau = 10, exp(-1/10) = 0.9048374180359595
      const result = decayValue(100, 1, 10);
      expect(result).toBeCloseTo(90.4837, 4);
    });

    it("should handle large tau (minimal decay)", () => {
      const result = decayValue(100, 1, 10000);
      expect(result).toBeCloseTo(99.99, 2);
    });

    it("should return initialValue when tau is Infinity", () => {
      expect(decayValue(100, 1, Infinity)).toBe(100);
    });

    it("should decay faster with smaller tau", () => {
      const slowDecay = decayValue(100, 1, 20);
      const fastDecay = decayValue(100, 1, 5);
      expect(fastDecay).toBeLessThan(slowDecay);
    });
  });

  describe("calculateImpulse", () => {
    it("calculates the correct impulse given intensity and k", () => {
      expect(calculateImpulse(10, 0.5)).toBe(5);
      expect(calculateImpulse(0, 0.5)).toBe(0);
      expect(calculateImpulse(10, 0)).toBe(0);
      expect(calculateImpulse(100, 1.2)).toBe(120);
    });
  });

  describe("calculatePeakingIndex", () => {
    it("calculates form using weighted fitness and fatigue constants", () => {
      const { FITNESS_K, FATIGUE_K } = BANISTER_CONSTANTS;

      // Basic calculation
      expect(calculatePeakingIndex(100, 50)).toBeCloseTo(100 * FITNESS_K - 50 * FATIGUE_K);
      // Reverse calculation
      expect(calculatePeakingIndex(50, 100)).toBeCloseTo(50 * FITNESS_K - 100 * FATIGUE_K);
      // Equal values
      expect(calculatePeakingIndex(50, 50)).toBeCloseTo(50 * FITNESS_K - 50 * FATIGUE_K);
      // Zero values
      expect(calculatePeakingIndex(0, 0)).toBe(0);
      // Decimal values
      expect(calculatePeakingIndex(10.5, 5.2)).toBeCloseTo(10.5 * FITNESS_K - 5.2 * FATIGUE_K);
    });

    it("results in a negative index when fatigue outweighs fitness", () => {
      expect(calculatePeakingIndex(20, 50)).toBeLessThan(0);
    });

    it("results in a positive index when fitness outweighs fatigue", () => {
      expect(calculatePeakingIndex(80, 20)).toBeGreaterThan(0);
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
