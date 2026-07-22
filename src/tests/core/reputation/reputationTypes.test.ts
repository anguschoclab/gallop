import { describe, it, expect } from "vitest";
import {
  calculateRaceWinReputation,
  calculateRaceLossReputation,
  getReputationTier,
  formatReputationTier,
} from "@/core/reputation/reputationTypes";

describe("reputationTypes", () => {
  describe("calculateRaceWinReputation", () => {
    it("returns base points and scales with purse correctly", () => {
      expect(calculateRaceWinReputation(undefined, 10000)).toBe(10);
      expect(calculateRaceWinReputation("G1", 100000)).toBe(62);
      expect(calculateRaceWinReputation(undefined, 2000000)).toBe(30); // capped at +20
      expect(calculateRaceWinReputation("G2", 10000)).toBe(45);
      expect(calculateRaceWinReputation("G3", 10000)).toBe(35);
      expect(calculateRaceWinReputation("Listed", 10000)).toBe(25);
    });
  });

  describe("calculateRaceLossReputation", () => {
    it("computes placement and slump penalties properly", () => {
      expect(calculateRaceLossReputation(undefined, 5, 10, 0)).toBe(0);
      expect(calculateRaceLossReputation("G1", 10, 10, 0)).toBe(-15);
      expect(calculateRaceLossReputation("G2", 10, 10, 0)).toBe(-12);
      expect(calculateRaceLossReputation("G1", 6, 10, 0)).toBe(-10); // bottom half
      expect(calculateRaceLossReputation(undefined, 5, 10, 3)).toBe(-5); // slump penalty
      expect(calculateRaceLossReputation("G1", 10, 10, 3)).toBe(-20); // both
    });
  });

  describe("getReputationTier", () => {
    it("maps scores to correct tiers", () => {
      expect(getReputationTier(0)).toBe("unknown");
      expect(getReputationTier(150)).toBe("local");
      expect(getReputationTier(300)).toBe("regional");
      expect(getReputationTier(450)).toBe("national");
      expect(getReputationTier(600)).toBe("international");
      expect(getReputationTier(750)).toBe("world_class");
      expect(getReputationTier(900)).toBe("legendary");
    });
  });

  describe("formatReputationTier", () => {
    it("returns correctly formatted strings for UI", () => {
      expect(formatReputationTier("unknown")).toBe("Unranked");
      expect(formatReputationTier("local")).toBe("Local");
      expect(formatReputationTier("legendary")).toBe("Legendary");
    });
  });
});
