import { describe, it, expect } from "vitest";
import {
  calculatePeakingIndex,
  decayValue,
  calculateImpulse,
  getPeakingBeyerMultiplier,
  BANISTER_CONSTANTS
} from "../banister";

describe("banister.ts", () => {
  describe("calculatePeakingIndex", () => {
    it("should correctly calculate the peaking index using the formula (Fitness * FITNESS_K) - (Fatigue * FATIGUE_K)", () => {
      const { FITNESS_K, FATIGUE_K } = BANISTER_CONSTANTS;

      // Basic calculation
      expect(calculatePeakingIndex(100, 50)).toBeCloseTo((100 * FITNESS_K) - (50 * FATIGUE_K));

      // Reverse calculation
      expect(calculatePeakingIndex(50, 100)).toBeCloseTo((50 * FITNESS_K) - (100 * FATIGUE_K));

      // Equal values
      expect(calculatePeakingIndex(50, 50)).toBeCloseTo((50 * FITNESS_K) - (50 * FATIGUE_K));

      // Zero values
      expect(calculatePeakingIndex(0, 0)).toBe(0);

      // Decimal values
      expect(calculatePeakingIndex(10.5, 5.2)).toBeCloseTo((10.5 * FITNESS_K) - (5.2 * FATIGUE_K));

      // Negative values (edge case)
      expect(calculatePeakingIndex(-10, -5)).toBeCloseTo((-10 * FITNESS_K) - (-5 * FATIGUE_K));
    });
  });

  describe("decayValue", () => {
    it("should decay a value using the formula V_old * exp(-1 / tau)", () => {
      // Testing with fitness tau (45)
      const fitnessDecay = 100 * Math.exp(-1 / 45);
      expect(decayValue(100, 45)).toBeCloseTo(fitnessDecay);

      // Testing with fatigue tau (15)
      const fatigueDecay = 100 * Math.exp(-1 / 15);
      expect(decayValue(100, 15)).toBeCloseTo(fatigueDecay);

      // Zero value remains zero
      expect(decayValue(0, 45)).toBe(0);
    });
  });

  describe("calculateImpulse", () => {
    it("should calculate impulse gain as intensity * k", () => {
      // Testing with different intensities and k constants
      expect(calculateImpulse(10, 1.0)).toBe(10);
      expect(calculateImpulse(10, 2.0)).toBe(20);
      expect(calculateImpulse(20, 0.5)).toBe(10);

      // Zero intensity gives zero impulse
      expect(calculateImpulse(0, 1.0)).toBe(0);
    });
  });

  describe("getPeakingBeyerMultiplier", () => {
    it("should return correct multipliers based on peaking index zones", () => {
      // Peak performance (> 20)
      expect(getPeakingBeyerMultiplier(25)).toBe(1.05);
      expect(getPeakingBeyerMultiplier(20.1)).toBe(1.05);

      // Good form (> 0 and <= 20)
      expect(getPeakingBeyerMultiplier(20)).toBe(1.02);
      expect(getPeakingBeyerMultiplier(10)).toBe(1.02);
      expect(getPeakingBeyerMultiplier(0.1)).toBe(1.02);

      // Standard form (> -10 and <= 0)
      expect(getPeakingBeyerMultiplier(0)).toBe(1.0);
      expect(getPeakingBeyerMultiplier(-5)).toBe(1.0);
      expect(getPeakingBeyerMultiplier(-9.9)).toBe(1.0);

      // Fatigued (> -30 and <= -10)
      expect(getPeakingBeyerMultiplier(-10)).toBe(0.95);
      expect(getPeakingBeyerMultiplier(-20)).toBe(0.95);
      expect(getPeakingBeyerMultiplier(-29.9)).toBe(0.95);

      // Severely overtrained/exhausted (<= -30)
      expect(getPeakingBeyerMultiplier(-30)).toBe(0.9);
      expect(getPeakingBeyerMultiplier(-40)).toBe(0.9);
    });
  });

  describe("BANISTER_CONSTANTS", () => {
    it("should have expected properties", () => {
      expect(BANISTER_CONSTANTS).toHaveProperty("FITNESS_TAU");
      expect(BANISTER_CONSTANTS).toHaveProperty("FATIGUE_TAU");
      expect(BANISTER_CONSTANTS).toHaveProperty("FITNESS_K");
      expect(BANISTER_CONSTANTS).toHaveProperty("FATIGUE_K");
      expect(BANISTER_CONSTANTS).toHaveProperty("WORKOUT_INTENSITY");

      // Sanity checks on default values
      expect(BANISTER_CONSTANTS.FITNESS_TAU).toBeGreaterThan(BANISTER_CONSTANTS.FATIGUE_TAU);
      expect(BANISTER_CONSTANTS.FATIGUE_K).toBeGreaterThan(BANISTER_CONSTANTS.FITNESS_K);
    });
  });
});
