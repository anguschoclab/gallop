import { describe, it, expect, vi } from "vitest";
import { calculateGeneticCompatibility } from "@/core/breeding/genotypeMatching";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

vi.mock("@/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/constants")>();
  return {
    ...actual,
    GENETIC_TRAIT_WEIGHT: 0.25,
    DEFAULT_GENETIC_DIVERSITY: 0.75,
    GENETIC_COMPATIBILITY_EXCELLENT_THRESHOLD: 0.8,
    GENETIC_COMPATIBILITY_GOOD_THRESHOLD: 0.6,
    GENETIC_COMPATIBILITY_MODERATE_THRESHOLD: 0.4,
    DEFAULT_TRAIT_SCORE: 0.5,
  };
});

describe("calculateGeneticCompatibility", () => {
  it("calculates score from sensory, signal, immunity, and diversity traits", () => {
    const sire = createTestHorse({
      geneticMarkers: {
        sensoryPerception: "excellent", // 1.0
        signalTransduction: "good", // 0.75
        immunity: "fair", // 0.5
        geneticDiversity: 0.8,
        leopardComplex: "recessive",
        csnbRisk: "low",
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false } as any,
      },
    });
    const dam = createTestHorse({
      geneticMarkers: {
        sensoryPerception: "excellent", // 1.0
        signalTransduction: "good", // 0.75
        immunity: "fair", // 0.5
        geneticDiversity: 0.8,
        leopardComplex: "recessive",
        csnbRisk: "low",
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false } as any,
      },
    });

    const result = calculateGeneticCompatibility(sire, dam);
    // (1.0 + 0.75 + 0.5 + 0.8) * 0.25 = 0.7625 score
    expect(result.score).toBe(0.7625);
    expect(result.description).toBe("Good genetic compatibility");
    expect(result.warning).toBeUndefined();
  });

  it("warns about Leopard complex homozygous risk", () => {
    const sire = createTestHorse({
      geneticMarkers: { leopardComplex: "dominant" } as any,
    });
    const dam = createTestHorse({
      geneticMarkers: { leopardComplex: "dominant" } as any,
    });

    const result = calculateGeneticCompatibility(sire, dam);
    expect(result.warning).toContain(
      "Both parents homozygous for Leopard complex - high CSNB risk in foal",
    );
  });

  it("warns about covering sickness transmission", () => {
    const sire = createTestHorse({ healthStatus: "covering_sickness" });
    const dam = createTestHorse();

    const result = calculateGeneticCompatibility(sire, dam);
    expect(result.warning).toContain(
      "High risk of covering sickness (dourine) transmission - sexually transmitted disease with 50%+ mortality",
    );
  });

  it("combines multiple warnings correctly", () => {
    const sire = createTestHorse({
      healthStatus: "covering_sickness",
      geneticMarkers: { leopardComplex: "dominant" } as any,
    });
    const dam = createTestHorse({
      healthStatus: "covering_sickness",
      geneticMarkers: { leopardComplex: "dominant" } as any,
    });

    const result = calculateGeneticCompatibility(sire, dam);
    expect(result.warning).toContain(
      "Both parents homozygous for Leopard complex - high CSNB risk in foal",
    );
    expect(result.warning).toContain(
      "High risk of covering sickness (dourine) transmission - sexually transmitted disease with 50%+ mortality",
    );
  });

  it("handles missing genetic markers gracefully", () => {
    const sire = createTestHorse();
    delete sire.geneticMarkers;
    const dam = createTestHorse();
    delete dam.geneticMarkers;

    const result = calculateGeneticCompatibility(sire, dam);
    // uses defaults of 'good' (0.75), diversity DEFAULT_GENETIC_DIVERSITY (0.75) from mock
    // (0.75 + 0.75 + 0.75 + 0.75) * 0.25 = 0.75
    expect(result.score).toBe(0.75);
    expect(result.description).toBe("Good genetic compatibility");
  });
});
