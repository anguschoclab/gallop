import { describe, it, expect } from "vitest";
import {
  calculateDosageProfile,
  calculateDosageIndex,
  calculateCenterOfDistribution,
  generatePedigree,
  calculateDosageMetrics,
  interpretDosageIndex,
} from "@/core/race/dosage";
import type { DosageProfile } from "@/game/types";

function emptyProfile(): DosageProfile {
  return { brilliant: 0, intermediate: 0, classic: 0, solid: 0, professional: 0 };
}

describe("calculateDosageProfile", () => {
  it("empty pedigree → all zeros", () => {
    const profile = calculateDosageProfile([]);
    expect(profile).toEqual(emptyProfile());
  });

  it("returns an object with all 5 aptitudinal keys", () => {
    const profile = calculateDosageProfile([]);
    expect(profile).toHaveProperty("brilliant");
    expect(profile).toHaveProperty("intermediate");
    expect(profile).toHaveProperty("classic");
    expect(profile).toHaveProperty("solid");
    expect(profile).toHaveProperty("professional");
  });
});

describe("calculateDosageIndex", () => {
  it("denominator = 0 → Infinity", () => {
    const profile: DosageProfile = {
      brilliant: 2,
      intermediate: 2,
      classic: 0,
      solid: 0,
      professional: 0,
    };
    expect(calculateDosageIndex(profile)).toBe(Infinity);
  });

  it("all zeros → Infinity (0/0 branch)", () => {
    expect(calculateDosageIndex(emptyProfile())).toBe(Infinity);
  });

  it("known formula: {brilliant:0, intermediate:0, classic:2, solid:2, professional:0} → (0+0+1)/(1+2+0) = 0.33", () => {
    const profile: DosageProfile = {
      brilliant: 0,
      intermediate: 0,
      classic: 2,
      solid: 2,
      professional: 0,
    };
    expect(calculateDosageIndex(profile)).toBeCloseTo(0.33, 2);
  });

  it("equal brilliant and solid → DI = 1", () => {
    const profile: DosageProfile = {
      brilliant: 2,
      intermediate: 0,
      classic: 0,
      solid: 2,
      professional: 0,
    };
    // numerator = 2, denominator = 2 → 1.0
    expect(calculateDosageIndex(profile)).toBeCloseTo(1.0, 2);
  });

  it("returns a number (finite or Infinity), never NaN", () => {
    const di = calculateDosageIndex({
      brilliant: 4,
      intermediate: 2,
      classic: 3,
      solid: 1,
      professional: 1,
    });
    expect(Number.isNaN(di)).toBe(false);
  });
});

describe("calculateCenterOfDistribution", () => {
  it("all zeros → 0", () => {
    expect(calculateCenterOfDistribution(emptyProfile())).toBe(0);
  });

  it("formula: (2B + I - S - 2P) / total", () => {
    // B=2, I=1, C=0, S=1, P=0 → (4+1-1-0)/(2+1+0+1+0) = 4/4 = 1.0
    const profile: DosageProfile = {
      brilliant: 2,
      intermediate: 1,
      classic: 0,
      solid: 1,
      professional: 0,
    };
    expect(calculateCenterOfDistribution(profile)).toBeCloseTo(1.0, 2);
  });

  it("pure professional profile → negative CD", () => {
    const profile: DosageProfile = {
      brilliant: 0,
      intermediate: 0,
      classic: 0,
      solid: 0,
      professional: 4,
    };
    // (0+0-0-8)/4 = -2
    expect(calculateCenterOfDistribution(profile)).toBeCloseTo(-2.0, 2);
  });

  it("pure brilliant profile → CD = 2", () => {
    const profile: DosageProfile = {
      brilliant: 4,
      intermediate: 0,
      classic: 0,
      solid: 0,
      professional: 0,
    };
    // (8)/4 = 2.0
    expect(calculateCenterOfDistribution(profile)).toBeCloseTo(2.0, 2);
  });

  it("returns number, never NaN", () => {
    const cd = calculateCenterOfDistribution({
      brilliant: 4,
      intermediate: 2,
      classic: 3,
      solid: 1,
      professional: 1,
    });
    expect(Number.isNaN(cd)).toBe(false);
  });
});

describe("generatePedigree", () => {
  it("undefined sireName → empty array", () => {
    expect(generatePedigree(undefined)).toEqual([]);
  });

  it("unknown sire name → empty array", () => {
    expect(generatePedigree("No Such Horse In Database XYZ")).toEqual([]);
  });

  it("returns an array", () => {
    expect(Array.isArray(generatePedigree())).toBe(true);
  });
});

describe("calculateDosageMetrics", () => {
  it("returns object with pedigree, dosageProfile, dosageIndex, centerOfDistribution", () => {
    const result = calculateDosageMetrics(undefined);
    expect(result).toHaveProperty("pedigree");
    expect(result).toHaveProperty("dosageProfile");
    expect(result).toHaveProperty("dosageIndex");
    expect(result).toHaveProperty("centerOfDistribution");
  });

  it("unknown sire → empty pedigree → profile is all zeros", () => {
    const { dosageProfile } = calculateDosageMetrics("Unknown Horse XYZ123");
    expect(dosageProfile).toEqual(emptyProfile());
  });
});

describe("interpretDosageIndex", () => {
  it("undefined → 'Extreme speed preference'", () => {
    expect(interpretDosageIndex(undefined)).toContain("Extreme speed");
  });

  it("Infinity → 'Extreme speed preference'", () => {
    expect(interpretDosageIndex(Infinity)).toContain("Extreme speed");
  });

  it(">= 4.0 → 'High speed preference'", () => {
    expect(interpretDosageIndex(4.0)).toContain("High speed");
    expect(interpretDosageIndex(5.5)).toContain("High speed");
  });

  it(">= 3.0 and < 4.0 → 'Above-average speed'", () => {
    expect(interpretDosageIndex(3.0)).toContain("Above-average speed");
    expect(interpretDosageIndex(3.5)).toContain("Above-average speed");
  });

  it(">= 2.4 and < 3.0 → 'Balanced'", () => {
    expect(interpretDosageIndex(2.4)).toContain("Balanced");
  });

  it(">= 1.5 and < 2.4 → 'Above-average stamina'", () => {
    expect(interpretDosageIndex(1.5)).toContain("Above-average stamina");
  });

  it("< 1.5 → 'High stamina preference'", () => {
    expect(interpretDosageIndex(1.0)).toContain("High stamina");
    expect(interpretDosageIndex(0.5)).toContain("High stamina");
  });
});
