import { describe, it, expect } from "vitest";
import { deriveHorseGenetics } from "@/core/horse/genetics-readout";
import type { Horse } from "@/core/horse/types";

function makeLocus(a: number, b: number): [number, number] {
  return [a, b];
}

// Minimal horse with only the fields deriveHorseGenetics reads.
function makeHorse(overrides: Partial<Horse> = {}): Horse {
  const hi = makeLocus(5, 5);
  return {
    sireName: "Northern Dancer",
    damName: "Natalma",
    bruceLoweFamily: 1,
    genotype: {
      color: { extension: hi, agouti: hi, gray: hi, cream: hi },
      stats: {
        speed: [hi, hi, hi, hi, hi, hi, hi, hi, hi, hi],
        stamina: [hi, hi, hi, hi, hi, hi, hi, hi, hi, hi],
        acceleration: [hi, hi, hi, hi, hi, hi, hi, hi, hi, hi],
        consistency: [hi, hi, hi, hi, hi, hi, hi, hi, hi, hi],
      },
      preferences: { distance: hi, surface: hi, climbing: hi, cornering: hi },
      style: makeLocus(1, 1), // avg 1 -> "E"
      mental: makeLocus(5, 5), // sum 10 -> excellent
      physical: makeLocus(4, 4), // sum 8 -> good
      durability: makeLocus(5, 5),
      size: makeLocus(5, 5),
      markers: {
        leopardComplex: "recessive",
        csnbRisk: "low",
        sensoryPerception: "good",
        signalTransduction: "good",
        immunity: "good",
        geneticDiversity: 0.5,
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
      },
      heart: [hi, hi, hi, hi, hi],
      fiberType: makeLocus(1, 1), // sum 2 -> sprinter
      stride: makeLocus(5, 5),
      trackBias: makeLocus(5, 5),
      mudAptitude: makeLocus(5, 5),
      weatherAptitude: makeLocus(1, 1), // sum 2 -> "dry"
      trainability: makeLocus(5, 5), // sum 10 -> 1.4
      peakAge: makeLocus(5, 5), // sum 10 -> 7
      recovery: makeLocus(5, 5),
      fertility: makeLocus(5, 5),
      foalingEase: makeLocus(1, 1), // sum 2 -> 1.4 (easiest)
      markings: { socks: hi, face: hi, silverDapple: hi, sabino: hi, splashWhite: hi },
      health: {
        bleeder: makeLocus(0, 0), // low risk
        roarer: makeLocus(5, 5), // high risk
        ocd: makeLocus(0, 0),
        efna5: makeLocus(0, 0),
        pssm: makeLocus(0, 0),
        rer: makeLocus(0, 0),
        epm: makeLocus(0, 0),
      },
    } as Horse["genotype"],
    id: "test-horse",
    name: "Test Horse",
    pedigree: {
      name: "Test Horse",
      generation: 0,
      sireId: undefined,
      damId: undefined,
      sireName: "Northern Dancer",
      damName: "Natalma",
    },
    birthDay: 0,
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "red",
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    energy: 100,
    fitness: 50,
    fatigue: 0,
    peakingIndex: 50,
    form: 50,
    potential: 80,
    recoveryPoints: 100,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    healthStatusDay: 0,
    isBlueHen: false,
    gelded: false,
    foalingEase: 1.4,
    heterozygosity: 0.5,
    fame: 0,
    owned: true,
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    mudAptitude: 1.0,
    corneringAptitude: 1.0,
    climbingAptitude: 1.0,
    peakAge: 5,
    strideType: "average",
    trackPreference: "balanced",
    weatherPreference: "dry",
    runningStyle: "E",
    bleederRisk: 0.02,
    roarerRisk: 0.1,
    ocdRisk: 0.02,
    recoveryRate: 1.0,
    trainability: 1.0,
    heartScore: 1.0,
    bloodline: "Northern Dancer",
    fiberBias: "balanced",
    healthStatus: "healthy",
    racingViable: true,
    lifecycleStatus: "active",
    courseVisits: {},
    ...overrides,
  } as Horse;
}

describe("deriveHorseGenetics", () => {
  it("maps loci to interpreted trait ratings", () => {
    const g = deriveHorseGenetics(makeHorse());
    expect(g.traits.temperament).toBe("excellent"); // mental
    expect(g.traits.constitution).toBe("good"); // physical
    expect(g.aptitude.weatherPreference).toBe("dry");
    expect(g.aptitude.fiberBias).toBe("sprinter");
  });

  it("flags a high-risk health condition and not a low-risk one", () => {
    const g = deriveHorseGenetics(makeHorse());
    const roarer = g.health.find((h) => h.key === "roarer");
    const bleeder = g.health.find((h) => h.key === "bleeder");
    expect(roarer?.risk).toBe("elevated");
    expect(bleeder?.risk).toBe("low");
  });

  it("computes dosage index and a human interpretation", () => {
    const g = deriveHorseGenetics(makeHorse());
    expect(typeof g.dosage.index).toBe("number");
    expect(g.dosage.interpretation.length).toBeGreaterThan(0);
  });

  it("returns an inbreeding/founder readout", () => {
    const g = deriveHorseGenetics(makeHorse());
    expect(g.inbreeding.description.length).toBeGreaterThan(0);
    expect(g.inbreeding.score).toBeGreaterThanOrEqual(0);
  });

  it("treats Unknown parents as unknown pedigree, not direct inbreeding", () => {
    const g = deriveHorseGenetics(makeHorse({ sireName: "Unknown", damName: "Unknown" }));
    expect(g.inbreeding.description).toBe("Unknown pedigree");
    expect(g.inbreeding.warning).toBeUndefined();
  });

  it("does not flag direct inbreeding when parents have different IDs, even with the same name", () => {
    const g = deriveHorseGenetics(
      makeHorse({
        sireId: "sire-1",
        damId: "dam-1",
        sireName: "Shared Name",
        damName: "Shared Name",
      }),
    );
    expect(g.inbreeding.description).not.toBe("Direct inbreeding detected");
    expect(g.inbreeding.warning).toBeUndefined();
  });

  it("flags direct inbreeding when sireId and damId are identical", () => {
    const g = deriveHorseGenetics(
      makeHorse({
        sireId: "same-parent",
        damId: "same-parent",
        sireName: "Same Parent",
        damName: "Same Parent",
      }),
    );
    expect(g.inbreeding.description).toBe("Direct inbreeding detected");
    expect(g.inbreeding.warning).toBe("Sire and dam are the same individual");
    expect(g.inbreeding.score).toBe(0);
  });
});
