import { describe, it, expect } from "vitest";
import {
  calculateGeneticCompatibility,
  calculateBlueHenContribution,
  calculateFounderEffect,
  calculateFoundationStockProximity,
  checkNickingAffinity,
  calculateDosageCompatibility,
  calculateParentPerformance,
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
  calculateBreedingCompatibility,
} from "@/core/breeding/compatibility";
import type { Horse } from "@/game/types";
import { generateDeterministicGenotype } from "@/core/genetics/generation";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "h1",
    name: "Test",
    sireName: "Sire",
    damName: "Dam",
    pedigree: { sireId: "s1", damId: "d1", name: "Pedigree", generation: 1 },
    birthDay: 1,
    age: 5,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#aabbcc",
    fanCount: 0,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    energy: 100,
    fitness: 100,
    fatigue: 0,
    peakingIndex: 0,
    recoveryPoints: 0,
    form: 0,
    potential: 80,
    raceHistory: [],
    ownership: { type: "unowned" },
    fame: 0,
    lifecycleStatus: "active" as const,
    healthStatus: "healthy",
    healthStatusDay: 1,
    genotype: generateDeterministicGenotype("Test", "budget"),
    distanceAptitude: 1200,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    injuryProneness: 0.1,
    height: 15.2,
    weight: 500,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    conformation: 70,
    temperament: 70,
    coatColor: "bay",
    runningStyle: "E",
    geneticMarkers: {
      leopardComplex: "recessive",
      csnbRisk: "low",
      sensoryPerception: "good",
      signalTransduction: "good",
      immunity: "good",
      geneticDiversity: 0.5,
      lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
    },
    heartScore: 1.0,
    fiberBias: "balanced",
    strideType: "average",
    trackPreference: "balanced",
    mudAptitude: 1.0,
    trainability: 0.7,
    peakAge: 5,
    recoveryRate: 0.8,
    fertility: 0.8,
    foalingEase: 1.2,
    markings: {
      socks: "none",
      face: "none",
      silverDapple: false,
      sabino: false,
      splashWhite: false,
    },
    bleederRisk: 0.05,
    roarerRisk: 0.03,
    ocdRisk: 0,
    racingViable: true,
    heterozygosity: 0.5,
    isBlueHen: false,
    gelded: false,
    bloodline: "standard",
    courseVisits: {},
    ...overrides,
  };
}

function mkMare(overrides: Partial<Horse> = {}): Horse {
  return mkHorse({ gender: "mare", ...overrides });
}

describe("calculateGeneticCompatibility", () => {
  it("excellent+excellent markers → higher score than poor+poor", () => {
    const sire = mkHorse({
      geneticMarkers: {
        leopardComplex: "recessive",
        csnbRisk: "low",
        sensoryPerception: "excellent",
        signalTransduction: "excellent",
        immunity: "excellent",
        geneticDiversity: 0.9,
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
      },
    });
    const dam = mkMare({
      geneticMarkers: {
        leopardComplex: "recessive",
        csnbRisk: "low",
        sensoryPerception: "excellent",
        signalTransduction: "excellent",
        immunity: "excellent",
        geneticDiversity: 0.9,
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
      },
    });
    const poorSire = mkHorse({
      geneticMarkers: {
        leopardComplex: "recessive",
        csnbRisk: "low",
        sensoryPerception: "poor",
        signalTransduction: "poor",
        immunity: "poor",
        geneticDiversity: 0.1,
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
      },
    });
    const poorDam = mkMare({
      geneticMarkers: {
        leopardComplex: "recessive",
        csnbRisk: "low",
        sensoryPerception: "poor",
        signalTransduction: "poor",
        immunity: "poor",
        geneticDiversity: 0.1,
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
      },
    });
    const excellent = calculateGeneticCompatibility(sire, dam);
    const poor = calculateGeneticCompatibility(poorSire, poorDam);
    expect(excellent.score).toBeGreaterThan(poor.score);
  });

  it("covering sickness → warning set", () => {
    const sire = mkHorse({ healthStatus: "covering_sickness" });
    const dam = mkMare();
    const result = calculateGeneticCompatibility(sire, dam);
    expect(result.warning).toBeTruthy();
    expect(result.warning).toContain("covering sickness");
  });

  it("no markers → score ~0.5 (all default 'fair')", () => {
    const sire = mkHorse({ geneticMarkers: undefined });
    const dam = mkMare({ geneticMarkers: undefined });
    const result = calculateGeneticCompatibility(sire, dam);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("returns score in [0, 1]", () => {
    const sire = mkHorse();
    const dam = mkMare();
    const { score } = calculateGeneticCompatibility(sire, dam);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("returns a description string", () => {
    const { description } = calculateGeneticCompatibility(mkHorse(), mkMare());
    expect(typeof description).toBe("string");
    expect(description.length).toBeGreaterThan(0);
  });
});

describe("calculateBlueHenContribution", () => {
  it("no blueHenStatus → { score: 0.3, isBlueHen: false }", () => {
    const dam = mkMare({ blueHenStatus: undefined });
    const result = calculateBlueHenContribution(dam);
    expect(result.score).toBe(0.3);
    expect(result.isBlueHen).toBe(false);
  });

  it("blue hen with G1 winners → score > 0.3", () => {
    const dam = mkMare({
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 3,
        group1WinnersProduced: 2,
        blueHenScore: 80,
        foalsProduced: 10,
      },
    });
    const result = calculateBlueHenContribution(dam);
    expect(result.score).toBeGreaterThan(0.3);
    expect(result.isBlueHen).toBe(true);
  });

  it("score is capped at 1.0", () => {
    const dam = mkMare({
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 100,
        group1WinnersProduced: 100,
        blueHenScore: 100,
        foalsProduced: 100,
      },
    });
    expect(calculateBlueHenContribution(dam).score).toBeLessThanOrEqual(1.0);
  });
});

describe("calculateConformationCompatibility", () => {
  it("both excellent → score = 1.0", () => {
    const sire = mkHorse({ conformation: 1.0 });
    const dam = mkMare({ conformation: 1.0 });
    expect(calculateConformationCompatibility(sire, dam).score).toBe(1.0);
  });

  it("both poor → score = 0.25", () => {
    const sire = mkHorse({ conformation: 0.25 });
    const dam = mkMare({ conformation: 0.25 });
    expect(calculateConformationCompatibility(sire, dam).score).toBe(0.25);
  });

  it("mixed → average of both values", () => {
    const sire = mkHorse({ conformation: 1.0 });
    const dam = mkMare({ conformation: 0.25 });
    const { score } = calculateConformationCompatibility(sire, dam);
    expect(score).toBeCloseTo(0.625, 3);
  });

  it("returns a description string", () => {
    const { description } = calculateConformationCompatibility(mkHorse(), mkMare());
    expect(typeof description).toBe("string");
  });
});

describe("calculateTemperamentCompatibility", () => {
  it("both excellent → score = 1.0", () => {
    const sire = mkHorse({ temperament: 1.0 });
    const dam = mkMare({ temperament: 1.0 });
    expect(calculateTemperamentCompatibility(sire, dam).score).toBe(1.0);
  });

  it("both poor → score = 0.25", () => {
    const sire = mkHorse({ temperament: 0.25 });
    const dam = mkMare({ temperament: 0.25 });
    expect(calculateTemperamentCompatibility(sire, dam).score).toBe(0.25);
  });
});

describe("calculateParentPerformance", () => {
  it("no race history → score = 0", () => {
    const { score } = calculateParentPerformance(
      mkHorse({ raceHistory: [] }),
      mkMare({ raceHistory: [] }),
    );
    expect(score).toBe(0);
  });

  it("G1 wins → high score", () => {
    const sire = mkHorse({
      raceHistory: [
        { raceId: "r1", raceName: "Race 1", position: 1, day: 5, grade: "G1" },
        { raceId: "r2", raceName: "Race 2", position: 1, day: 10, grade: "G1" },
      ],
    });
    const dam = mkMare({
      raceHistory: [{ raceId: "r3", raceName: "Race 3", position: 1, day: 15, grade: "G1" }],
    });
    const { score } = calculateParentPerformance(sire, dam);
    expect(score).toBeGreaterThan(0);
  });

  it("score is normalized to [0, 1]", () => {
    const sire = mkHorse({
      raceHistory: Array.from({ length: 20 }, (_, i) => ({
        raceId: `r${i}`,
        raceName: `Race ${i}`,
        position: 1,
        day: i + 1,
        grade: "G1" as const,
      })),
    });
    const dam = mkMare({ raceHistory: [] });
    const { score } = calculateParentPerformance(sire, dam);
    expect(score).toBeLessThanOrEqual(1.0);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("checkNickingAffinity", () => {
  it("unknown names → { hasAffinity: false, affinity: 0 }", () => {
    const result = checkNickingAffinity("Unknown A", "Unknown B");
    expect(result.hasAffinity).toBe(false);
    expect(result.affinity).toBe(0);
  });

  it("returns a description string", () => {
    const { description } = checkNickingAffinity("A", "B");
    expect(typeof description).toBe("string");
  });
});

describe("calculateDosageCompatibility", () => {
  it("unknown sires → score = 0.5 (insufficient data)", () => {
    const { score, description } = calculateDosageCompatibility("Unknown X", "Unknown Y");
    expect(score).toBe(0.5);
    expect(description).toContain("Insufficient");
  });
});

describe("calculateFounderEffect", () => {
  it("unknown names → score > 0 (default behavior)", () => {
    const { score } = calculateFounderEffect("Unknown A", "Unknown B");
    expect(score).toBeGreaterThan(0);
  });
});

describe("calculateFoundationStockProximity", () => {
  it("unknown names → score = 0", () => {
    const { score } = calculateFoundationStockProximity("Unknown A", "Unknown B");
    expect(score).toBe(0);
  });
});

describe("calculateBreedingCompatibility", () => {
  it("overallScore is in [0, 1]", () => {
    const sire = mkHorse();
    const dam = mkMare();
    const result = calculateBreedingCompatibility(sire, dam);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  it("all factors are present in result", () => {
    const result = calculateBreedingCompatibility(mkHorse(), mkMare());
    expect(result.factors).toHaveProperty("nicking");
    expect(result.factors).toHaveProperty("dosage");
    expect(result.factors).toHaveProperty("inbreeding");
    expect(result.factors).toHaveProperty("parentPerformance");
    expect(result.factors).toHaveProperty("conformation");
    expect(result.factors).toHaveProperty("temperament");
    expect(result.factors).toHaveProperty("foundationStock");
    expect(result.factors).toHaveProperty("founderEffect");
    expect(result.factors).toHaveProperty("genetic");
    expect(result.factors).toHaveProperty("blueHen");
  });

  it("recommendation is a non-empty string", () => {
    const result = calculateBreedingCompatibility(mkHorse(), mkMare());
    expect(typeof result.recommendation).toBe("string");
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it("better-matched pair produces higher score", () => {
    const excellentSire = mkHorse({
      conformation: 1.0,
      temperament: 1.0,
      raceHistory: [{ raceId: "r1", raceName: "G1 Race", position: 1, day: 1, grade: "G1" }],
    });
    const excellentDam = mkMare({
      conformation: 1.0,
      temperament: 1.0,
    });
    const poorSire = mkHorse({ conformation: 0.25, temperament: 0.25, raceHistory: [] });
    const poorDam = mkMare({ conformation: 0.25, temperament: 0.25 });
    const goodScore = calculateBreedingCompatibility(excellentSire, excellentDam).overallScore;
    const badScore = calculateBreedingCompatibility(poorSire, poorDam).overallScore;
    expect(goodScore).toBeGreaterThan(badScore);
  });

  it("does not flag direct inbreeding from shared grand-sire names alone", () => {
    const sire = mkHorse({
      sireName: "Grandsire A",
      pedigree: { name: "Sire Pedigree", generation: 1, sireId: "gs-a-1", damId: "d-1" },
    });
    const dam = mkMare({
      sireName: "Grandsire A",
      pedigree: { name: "Dam Pedigree", generation: 1, sireId: "gs-a-2", damId: "d-2" },
    });
    const result = calculateBreedingCompatibility(sire, dam);
    expect(result.factors.founderEffect.description).not.toBe("Direct inbreeding detected");
    expect(result.factors.founderEffect.warning).toBeUndefined();
  });

  it("still flags high inbreeding for a sire-to-daughter mating via COI", () => {
    const sire = mkHorse({ id: "father" });
    const dam = mkMare({
      id: "daughter",
      pedigree: { name: "Daughter", generation: 1, sireId: "father", damId: "mother" },
    });
    const result = calculateBreedingCompatibility(sire, dam);
    expect(result.factors.inbreeding.description).toContain("25.0%");
    expect(result.factors.inbreeding.warning).toContain("High inbreeding");
  });
});
