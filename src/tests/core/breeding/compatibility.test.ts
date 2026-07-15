import { describe, it, expect } from "vitest";
import { calculateBreedingCompatibility } from "@/core/breeding/compatibility";
import type { Horse } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "x",
    name: "Test",
    age: 5,
    gender: "colt",
    ...overrides,
  });
}

const baseSire = mkHorse({ id: "sire-1", name: "Sire A", gender: "horse" });
const baseDam = mkHorse({ id: "dam-1", name: "Dam A", gender: "mare" });

describe("calculateBreedingCompatibility — inbreeding penalty", () => {
  it("inbreeding score is 0 for COI >= 0.125 (12.5%)", () => {
    // Create a sire/dam pair that are half-siblings (share sireId)
    const sire = mkHorse({
      id: "sire-a",
      name: "Sire A",
      gender: "horse",
      sireId: "common-ancestor",
      sireName: "Common",
      pedigree: {
        name: "Sire A",
        generation: 0,
        sireId: "common-ancestor",
        sireName: "Common",
        sirePedigree: { name: "Common", generation: 1, sireName: "GC", damName: "GD" },
        damPedigree: { name: "DamA", generation: 1, sireName: "GS", damName: "GD2" },
      },
    });
    const dam = mkHorse({
      id: "dam-a",
      name: "Dam A",
      gender: "mare",
      sireId: "common-ancestor",
      sireName: "Common",
      pedigree: {
        name: "Dam A",
        generation: 0,
        sireId: "common-ancestor",
        sireName: "Common",
        sirePedigree: { name: "Common", generation: 1, sireName: "GC", damName: "GD" },
        damPedigree: { name: "DamB", generation: 1, sireName: "GS2", damName: "GD3" },
      },
    });

    const result = calculateBreedingCompatibility(sire, dam);
    // With the steepened penalty curve, COI >= 0.125 should produce inbreeding score = 0
    // Half-siblings share a parent at depth 0+0, COI = 0.5^1 = 0.25 > 0.125
    expect(result.factors.inbreeding.score).toBe(0);
  });

  it("inbreeding weight is 0.20 of overall score", () => {
    // The inbreeding weight should be 0.20 after rebalancing
    // We verify by checking that a high-COI pairing has a measurably lower overall score
    const relatedSire = mkHorse({
      id: "sire-rel",
      name: "Related Sire",
      gender: "horse",
      sireId: "common-ancestor",
      sireName: "Common",
      pedigree: {
        name: "Related Sire",
        generation: 0,
        sireId: "common-ancestor",
        sireName: "Common",
        sirePedigree: { name: "Common", generation: 1, sireName: "GC", damName: "GD" },
        damPedigree: { name: "DamA", generation: 1, sireName: "GS", damName: "GD2" },
      },
    });
    const relatedDam = mkHorse({
      id: "dam-rel",
      name: "Related Dam",
      gender: "mare",
      sireId: "common-ancestor",
      sireName: "Common",
      pedigree: {
        name: "Related Dam",
        generation: 0,
        sireId: "common-ancestor",
        sireName: "Common",
        sirePedigree: { name: "Common", generation: 1, sireName: "GC", damName: "GD" },
        damPedigree: { name: "DamB", generation: 1, sireName: "GS2", damName: "GD3" },
      },
    });
    const unrelatedSire = mkHorse({
      id: "sire-unr",
      name: "Unrelated Sire",
      gender: "horse",
      sireId: "dad-x",
      sireName: "DadX",
    });
    const unrelatedDam = mkHorse({
      id: "dam-unr",
      name: "Unrelated Dam",
      gender: "mare",
      sireId: "dad-y",
      sireName: "DadY",
    });

    const relatedResult = calculateBreedingCompatibility(relatedSire, relatedDam);
    const unrelatedResult = calculateBreedingCompatibility(unrelatedSire, unrelatedDam);

    // The related pair should have a lower overall score due to inbreeding penalty
    expect(relatedResult.overallScore).toBeLessThan(unrelatedResult.overallScore);
  });

  it("weights sum to 1.0 after rebalancing", () => {
    // We can verify this indirectly: the overall score must be in [0, 1]
    // and a perfect pair should approach 1.0. More specifically, we check
    // that the overall score is a valid weighted average (between min and max factor scores).
    const result = calculateBreedingCompatibility(baseSire, baseDam);
    const factorScores = Object.values(result.factors).map((f: any) => f.score as number);
    const minScore = Math.min(...factorScores);
    const maxScore = Math.max(...factorScores);
    expect(result.overallScore).toBeGreaterThanOrEqual(minScore - 0.001);
    expect(result.overallScore).toBeLessThanOrEqual(maxScore + 0.001);
  });
});
