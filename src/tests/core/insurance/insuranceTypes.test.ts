import { describe, it, expect } from "vitest";
import { calculateDailyPremium, INSURANCE_CONFIG } from "@/core/insurance/insuranceTypes";

describe("insuranceTypes", () => {
  describe("calculateDailyPremium", () => {
    it("returns 0 for 'none' policy type", () => {
      expect(calculateDailyPremium("none", 100000)).toBe(0);
    });

    it("calculates premium for injury_only", () => {
      const value = 10000;
      const base = INSURANCE_CONFIG.PREMIUMS["injury_only"];
      const expectedRisk = (value / 10000) * 2;
      expect(calculateDailyPremium("injury_only", value)).toBe(Math.round(base + expectedRisk));
    });

    it("calculates premium for comprehensive", () => {
      const value = 100000;
      const base = INSURANCE_CONFIG.PREMIUMS["comprehensive"];
      const expectedRisk = (value / 10000) * 5;
      expect(calculateDailyPremium("comprehensive", value)).toBe(Math.round(base + expectedRisk));
    });
  });
});
