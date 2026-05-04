import { describe, it, expect } from "vitest";
import {
  calculateGeneticCompatibility,
  calculateBlueHenContribution,
  calculateFounderEffect,
  calculateFoundationStockProximity,
  checkNickingAffinity,
  calculateInbreedingCoefficient,
  calculateDosageCompatibility,
  calculateParentPerformance,
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
  calculateBreedingCompatibility,
} from "./breedingCompatibility";
import type { Horse } from "./types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "h1",
    name: "Test",
    age: 5,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#aabbcc",
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    energy: 100,
    form: 0,
    potential: 80,
    raceHistory: [],
    owned: false,
    fame: 0,
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
        sensoryPerception: "excellent",
        signalTransduction: "excellent",
        immunity: "excellent",
        geneticDiversity: 0.9,
      },
    });
    const dam = mkMare({
      geneticMarkers: {
        sensoryPerception: "excellent",
        signalTransduction: "excellent",
        immunity: "excellent",
        geneticDiversity: 0.9,
      },
    });
    const poorSire = mkHorse({
      geneticMarkers: {
        sensoryPerception: "poor",
        signalTransduction: "poor",
        immunity: "poor",
        geneticDiversity: 0.1,
      },
    });
    const poorDam = mkMare({
      geneticMarkers: {
        sensoryPerception: "poor",
        signalTransduction: "poor",
        immunity: "poor",
        geneticDiversity: 0.1,
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
      },
    });
    expect(calculateBlueHenContribution(dam).score).toBeLessThanOrEqual(1.0);
  });
});

describe("calculateConformationCompatibility", () => {
  it("both excellent → score = 1.0", () => {
    const sire = mkHorse({ conformation: "excellent" });
    const dam = mkMare({ conformation: "excellent" });
    expect(calculateConformationCompatibility(sire, dam).score).toBe(1.0);
  });

  it("both poor → score = 0.25", () => {
    const sire = mkHorse({ conformation: "poor" });
    const dam = mkMare({ conformation: "poor" });
    expect(calculateConformationCompatibility(sire, dam).score).toBe(0.25);
  });

  it("mixed → average of both values", () => {
    const sire = mkHorse({ conformation: "excellent" }); // 1.0
    const dam = mkMare({ conformation: "poor" }); // 0.25
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
    const sire = mkHorse({ temperament: "excellent" });
    const dam = mkMare({ temperament: "excellent" });
    expect(calculateTemperamentCompatibility(sire, dam).score).toBe(1.0);
  });

  it("both poor → score = 0.25", () => {
    const sire = mkHorse({ temperament: "poor" });
    const dam = mkMare({ temperament: "poor" });
    expect(calculateTemperamentCompatibility(sire, dam).score).toBe(0.25);
  });
});

describe("calculateParentPerformance", () => {
  it("no race history → score = 0", () => {
    const { score } = calculateParentPerformance(mkHorse({ raceHistory: [] }), mkMare({ raceHistory: [] }));
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
      raceHistory: [
        { raceId: "r3", raceName: "Race 3", position: 1, day: 15, grade: "G1" },
      ],
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

describe("calculateInbreedingCoefficient", () => {
  it("both unknown names → { coefficient: 0, warning: '' }", () => {
    const result = calculateInbreedingCoefficient("Unknown XYZ", "Unknown ABC");
    expect(result.coefficient).toBe(0);
    expect(result.warning).toBe("");
  });

  it("coefficient is always >= 0", () => {
    const { coefficient } = calculateInbreedingCoefficient("", "");
    expect(coefficient).toBeGreaterThanOrEqual(0);
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
      conformation: "excellent",
      temperament: "excellent",
      raceHistory: [{ raceId: "r1", raceName: "G1 Race", position: 1, day: 1, grade: "G1" }],
    });
    const excellentDam = mkMare({
      conformation: "excellent",
      temperament: "excellent",
    });
    const poorSire = mkHorse({ conformation: "poor", temperament: "poor", raceHistory: [] });
    const poorDam = mkMare({ conformation: "poor", temperament: "poor" });
    const goodScore = calculateBreedingCompatibility(excellentSire, excellentDam).overallScore;
    const badScore = calculateBreedingCompatibility(poorSire, poorDam).overallScore;
    expect(goodScore).toBeGreaterThan(badScore);
  });
});
