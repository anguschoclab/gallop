import { describe, it, expect } from "vitest";
import { computeWeatherInjuryMultiplier } from "@/core/health/healthSystem";

describe("computeWeatherInjuryMultiplier", () => {
  it("should return 1.0 when context is undefined", () => {
    expect(computeWeatherInjuryMultiplier(undefined)).toBe(1.0);
  });

  it("should return 1.0 for empty context", () => {
    expect(computeWeatherInjuryMultiplier({})).toBe(1.0);
  });

  describe("SimWeatherPattern modifiers", () => {
    it("applies correct multipliers for different weather patterns", () => {
      expect(computeWeatherInjuryMultiplier({ pattern: "storm" })).toBe(2.0);
      expect(computeWeatherInjuryMultiplier({ pattern: "snow" })).toBe(1.8);
      expect(computeWeatherInjuryMultiplier({ pattern: "rain" })).toBe(1.5);
      expect(computeWeatherInjuryMultiplier({ pattern: "shower" })).toBe(1.2);
      expect(computeWeatherInjuryMultiplier({ pattern: "overcast" })).toBe(1.05);
      expect(computeWeatherInjuryMultiplier({ pattern: "clear" as any })).toBe(1.0); // Not mapped, should be 1
    });

    it("ignores legacy weather if pattern is provided", () => {
      expect(computeWeatherInjuryMultiplier({ pattern: "overcast", weather: "rainy" })).toBe(1.05);
    });

    it("uses legacy weather fallback if pattern is not provided", () => {
      expect(computeWeatherInjuryMultiplier({ weather: "rainy" })).toBe(1.4);
    });
  });

  describe("TrackCondition modifiers", () => {
    it("applies correct multipliers for track conditions", () => {
      expect(computeWeatherInjuryMultiplier({ trackCondition: "heavy" })).toBe(1.6);
      expect(computeWeatherInjuryMultiplier({ trackCondition: "yielding" })).toBe(1.3);
      expect(computeWeatherInjuryMultiplier({ trackCondition: "soft" })).toBe(1.2);
      expect(computeWeatherInjuryMultiplier({ trackCondition: "fast" })).toBe(1.0); // Not mapped
    });
  });

  describe("Snow hazard", () => {
    it("applies severe slip hazard multiplier if snow is true", () => {
      expect(computeWeatherInjuryMultiplier({ snow: true })).toBe(1.8);
      expect(computeWeatherInjuryMultiplier({ snow: false })).toBe(1.0);
    });
  });

  describe("Temperature extremes", () => {
    it("applies correct multipliers for temperature ranges", () => {
      // Freezing (<= 0)
      expect(computeWeatherInjuryMultiplier({ tempC: -5 })).toBe(1.6);
      expect(computeWeatherInjuryMultiplier({ tempC: 0 })).toBe(1.6);

      // Very cold (<= 5)
      expect(computeWeatherInjuryMultiplier({ tempC: 1 })).toBe(1.25);
      expect(computeWeatherInjuryMultiplier({ tempC: 5 })).toBe(1.25);

      // Benign (>5 and <30)
      expect(computeWeatherInjuryMultiplier({ tempC: 20 })).toBe(1.0);

      // Hot (>= 30)
      expect(computeWeatherInjuryMultiplier({ tempC: 30 })).toBe(1.2);
      expect(computeWeatherInjuryMultiplier({ tempC: 34 })).toBe(1.2);

      // Scorching (>= 35)
      expect(computeWeatherInjuryMultiplier({ tempC: 35 })).toBe(1.5);
      expect(computeWeatherInjuryMultiplier({ tempC: 40 })).toBe(1.5);
    });
  });

  describe("Wind speeds", () => {
    it("applies correct multipliers for wind speeds", () => {
      // High wind (>= 60)
      expect(computeWeatherInjuryMultiplier({ windKph: 60 })).toBe(1.4);
      expect(computeWeatherInjuryMultiplier({ windKph: 80 })).toBe(1.4);

      // Medium-high wind (>= 40)
      expect(computeWeatherInjuryMultiplier({ windKph: 40 })).toBe(1.2);
      expect(computeWeatherInjuryMultiplier({ windKph: 59 })).toBe(1.2);

      // Noticeable wind (>= 25)
      expect(computeWeatherInjuryMultiplier({ windKph: 25 })).toBe(1.05);
      expect(computeWeatherInjuryMultiplier({ windKph: 39 })).toBe(1.05);

      // Low wind (< 25)
      expect(computeWeatherInjuryMultiplier({ windKph: 20 })).toBe(1.0);
      expect(computeWeatherInjuryMultiplier({ windKph: 0 })).toBe(1.0);
    });
  });

  describe("Compound multipliers", () => {
    it("correctly stacks multiple adverse conditions", () => {
      const ctx = {
        pattern: "storm" as const, // x2.0
        trackCondition: "heavy" as const, // x1.6
        tempC: 0, // x1.6
        windKph: 70, // x1.4
        snow: true, // x1.8
      };

      // 2.0 * 1.6 * 1.6 * 1.4 * 1.8 = 12.9024
      const result = computeWeatherInjuryMultiplier(ctx);
      expect(result).toBeCloseTo(12.9024, 4);
    });
  });
});
