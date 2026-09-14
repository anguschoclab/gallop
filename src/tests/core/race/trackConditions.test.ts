import { describe, it, expect, vi } from "vitest";
import {
  calculateConditionChange,
  calculateConditionRecovery,
  randomTrackConditionWithClimateBias,
  getRailBias,
  getRegionalTerminology,
  getSpeedModifier,
  getStaminaDrainModifier,
  getTurfRailPosition,
  isMaintenanceApplicable
} from "@/core/race/trackConditions";
import { createRng } from "@/core/common/rng";

describe("trackConditions", () => {
  describe("getRailBias", () => {
    it("returns correct bias for turf rail positions", () => {
      expect(getRailBias("true")).toBe(0.05);
      expect(getRailBias("+10ft")).toBe(0);
      expect(getRailBias("+20ft")).toBe(-0.02);
      expect(getRailBias("+30ft")).toBe(-0.05);
    });
  });

  describe("calculateConditionChange", () => {
    it("calculates deterioration and downgrades condition if needed", () => {
      expect(calculateConditionChange("good", "heavy_rain", 8, 0.5)).toBe("yielding");
      expect(calculateConditionChange("fast", "dry", 2, 0.5)).toBe("fast");
    });
  });

  describe("calculateConditionRecovery", () => {
    it("calculates recovery and upgrades condition", () => {
      expect(calculateConditionRecovery("yielding", 2, "temperate")).toBe("soft");
      expect(calculateConditionRecovery("heavy", 5, "arid")).toBe("fast");
    });
  });

  describe("randomTrackConditionWithClimateBias", () => {
    it("generates conditions based on rng and climate weights", () => {
      const rng0 = createRng("test0");
      vi.spyOn(rng0, "next").mockReturnValue(0.1);
      expect(randomTrackConditionWithClimateBias(rng0, "temperate", "turf")).toBe("fast");

      const rng1 = createRng("test1");
      vi.spyOn(rng1, "next").mockReturnValue(0.6);
      expect(randomTrackConditionWithClimateBias(rng1, "temperate", "turf")).toBe("good");

      const rng2 = createRng("test2");
      vi.spyOn(rng2, "next").mockReturnValue(0.999);
      expect(randomTrackConditionWithClimateBias(rng2, "temperate", "turf")).toBe("yielding");
    });

    it("filters out invalid conditions for synthetic surfaces", () => {
      const rng = createRng("test3");
      vi.spyOn(rng, "next").mockReturnValue(0.99);
      expect(randomTrackConditionWithClimateBias(rng, "tropical", "synthetic")).toBe("soft");
    });
  });

  describe("getRegionalTerminology", () => {
    it("returns correct labels", () => {
      const term = getRegionalTerminology("heavy", "australia");
      expect(term.label).toBe("Heavy");
      expect(term.abbreviation).toBe("H");
    });
  });

  describe("getSpeedModifier", () => {
    it("returns base modifier for fast/good", () => {
      expect(getSpeedModifier("fast")).toBe(1.0);
      expect(getSpeedModifier("good", 1.5)).toBe(0.985);
    });

    it("applies mud aptitude for harsh conditions", () => {
      expect(getSpeedModifier("soft", 1.0)).toBe(0.95);
      expect(getSpeedModifier("soft", 1.1)).toBeCloseTo(0.95 * 1.1);
      expect(getSpeedModifier("heavy", 0.9)).toBeCloseTo(0.93 * 0.9);
      expect(getSpeedModifier("yielding", 1.2)).toBeCloseTo(0.9 * 1.2);
    });
  });

  describe("getStaminaDrainModifier", () => {
    it("returns correct drain multiplier", () => {
      expect(getStaminaDrainModifier("fast")).toBe(1.0);
      expect(getStaminaDrainModifier("yielding")).toBe(1.5);
    });
  });

  describe("getTurfRailPosition", () => {
    it("returns default position if no override", () => {
      expect(getTurfRailPosition("fast")).toBe("true");
      expect(getTurfRailPosition("soft")).toBe("+10ft");
    });

    it("returns override position if provided", () => {
      expect(getTurfRailPosition("fast", "+30ft")).toBe("+30ft");
    });
  });

  describe("isMaintenanceApplicable", () => {
    it("checks if action is valid for surface", () => {
      expect(isMaintenanceApplicable("harrow", "dirt")).toBe(true);
      expect(isMaintenanceApplicable("harrow", "synthetic")).toBe(false);
      expect(isMaintenanceApplicable("roll", "turf")).toBe(true);
      expect(isMaintenanceApplicable("seal", "turf")).toBe(false);
    });
  });
});
