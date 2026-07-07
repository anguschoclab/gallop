import { describe, it, expect } from "vitest";
import {
  getNominationTier,
  calculateNominationFee,
  getRaceGrade,
  NOMINATION_FEE_G1_EARLY,
  NOMINATION_FEE_G1_STANDARD,
  NOMINATION_FEE_G1_LATE,
  NOMINATION_FEE_G2_EARLY,
  NOMINATION_FEE_G2_STANDARD,
  NOMINATION_FEE_G2_LATE,
  NOMINATION_FEE_G3_EARLY,
  NOMINATION_FEE_G3_STANDARD,
  NOMINATION_FEE_G3_LATE,
  NOMINATION_TIER_EARLY_DAYS_THRESHOLD,
  NOMINATION_TIER_STANDARD_DAYS_THRESHOLD,
} from "@/core/racing/nominationFees";

describe("nominationFees", () => {
  describe("getNominationTier", () => {
    it("returns 'early' when days until race is >= early threshold", () => {
      expect(getNominationTier(NOMINATION_TIER_EARLY_DAYS_THRESHOLD)).toBe("early");
      expect(getNominationTier(NOMINATION_TIER_EARLY_DAYS_THRESHOLD + 10)).toBe("early");
    });

    it("returns 'standard' when days until race is >= standard threshold but < early threshold", () => {
      expect(getNominationTier(NOMINATION_TIER_STANDARD_DAYS_THRESHOLD)).toBe("standard");
      expect(getNominationTier(NOMINATION_TIER_EARLY_DAYS_THRESHOLD - 1)).toBe("standard");
    });

    it("returns 'late' when days until race is < standard threshold", () => {
      expect(getNominationTier(NOMINATION_TIER_STANDARD_DAYS_THRESHOLD - 1)).toBe("late");
      expect(getNominationTier(0)).toBe("late");
      expect(getNominationTier(-5)).toBe("late");
    });
  });

  describe("calculateNominationFee", () => {
    it("returns correct fee for G1", () => {
      expect(calculateNominationFee("G1", "early")).toBe(NOMINATION_FEE_G1_EARLY);
      expect(calculateNominationFee("G1", "standard")).toBe(NOMINATION_FEE_G1_STANDARD);
      expect(calculateNominationFee("G1", "late")).toBe(NOMINATION_FEE_G1_LATE); // null
    });

    it("returns correct fee for G2", () => {
      expect(calculateNominationFee("G2", "early")).toBe(NOMINATION_FEE_G2_EARLY);
      expect(calculateNominationFee("G2", "standard")).toBe(NOMINATION_FEE_G2_STANDARD);
      expect(calculateNominationFee("G2", "late")).toBe(NOMINATION_FEE_G2_LATE);
    });

    it("returns correct fee for G3", () => {
      expect(calculateNominationFee("G3", "early")).toBe(NOMINATION_FEE_G3_EARLY);
      expect(calculateNominationFee("G3", "standard")).toBe(NOMINATION_FEE_G3_STANDARD);
      expect(calculateNominationFee("G3", "late")).toBe(NOMINATION_FEE_G3_LATE);
    });

    it("returns null for invalid or missing grades", () => {
      expect(calculateNominationFee(null, "early")).toBeNull();
      expect(calculateNominationFee(undefined, "early")).toBeNull();
      // @ts-expect-error Testing invalid runtime input
      expect(calculateNominationFee("G4", "early")).toBeNull();
    });
  });

  describe("getRaceGrade", () => {
    it("returns graded_override grade if present", () => {
      const race = { graded_override: { grade: "G1" as const }, graded: { grade: "G2" as const } };
      expect(getRaceGrade(race)).toBe("G1");
    });

    it("returns graded grade if graded_override is missing", () => {
      const race = { graded: { grade: "G2" as const } };
      expect(getRaceGrade(race)).toBe("G2");
    });

    it("returns graded grade if graded_override.grade is missing", () => {
      const race = { graded_override: {}, graded: { grade: "G3" as const } };
      expect(getRaceGrade(race)).toBe("G3");
    });

    it("returns null if neither graded nor graded_override provides a grade", () => {
      const race1 = {};
      expect(getRaceGrade(race1)).toBeNull();

      const race2 = { graded: {}, graded_override: {} };
      expect(getRaceGrade(race2)).toBeNull();
    });
  });
});
