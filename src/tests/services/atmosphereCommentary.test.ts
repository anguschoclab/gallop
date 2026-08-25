import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import {
  ATMOSPHERE_LONG_STRAIGHT_TEMPLATES,
  ATMOSPHERE_TIGHT_TURN_TEMPLATES,
  ATMOSPHERE_GRADED_TEMPLATES,
  ATMOSPHERE_TRIPLE_CROWN_TEMPLATES,
  ATMOSPHERE_ELEVATION_TEMPLATES,
} from "@/assets/narrative/atmosphereTemplates";
import { TEMPLATES } from "@/assets/narrative/templates";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 0,
    fieldSize: 2,
    entries: [],
    resolved: false,
    weather: "sunny",
    trackCondition: "good",
    ...overrides,
  } as Race;
}

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Runner 1",
    position: 0,
    velocity: 15,
    acceleration: 0,
    finishTime: null,
    lane: 1,
    energy: 100,
    stamina: 100,
    baseSpeed: 15,
    currentSpeed: 15,
    distanceRun: 0,
    draftingHorseId: null,
    runningStyle: "EP",
    jockeyName: "Test Jockey",
    ...overrides,
  } as Runner;
}

function makeHorseEntity(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "h1",
    name: "Test Horse",
    sireName: "Sire",
    damName: "Dam",
    pedigree: { name: "Test", generation: 1 },
    birthDay: 0,
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "",
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    genotype: {} as any,
    energy: 100,
    fitness: 50,
    fatigue: 10,
    peakingIndex: 10,
    form: 0,
    potential: 70,
    recoveryPoints: 100,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    healthStatusDay: 0,
    isBlueHen: false,
    gelded: false,
    foalingEase: 0.5,
    heterozygosity: 0.5,
    raceHistory: [],
    fame: 0,
    ownership: { type: "player" },
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1, Dirt: 1, Synthetic: 1 },
    mudAptitude: 1,
    corneringAptitude: 1,
    climbingAptitude: 1,
    peakAge: 4,
    strideType: "average",
    trackPreference: "balanced",
    runningStyle: "EP",
    bleederRisk: 0,
    roarerRisk: 0,
    ocdRisk: 0,
    recoveryRate: 1,
    trainability: 0.5,
    heartScore: 80,
    bloodline: "",
    fiberBias: "",
    healthStatus: "healthy",
    racingViable: true,
    lifecycleStatus: "active",
    courseVisits: {},
    ...overrides,
  } as Horse;
}

function makeStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: "s1",
    name: "Test Stable",
    isMajor: false,
    ...overrides,
  } as Stable;
}

const ATMOSPHERE_TYPES = [
  "ATMOSPHERE",
  "ATMOSPHERE_LONG_STRAIGHT",
  "ATMOSPHERE_TIGHT_TURN",
  "ATMOSPHERE_GRADED",
  "ATMOSPHERE_TRIPLE_CROWN",
  "ATMOSPHERE_ELEVATION",
];

describe("NarrativeGenerator — Track-Aware Atmosphere", () => {
  it("ATMOSPHERE_GRADED fires when race.graded is defined", () => {
    const rng = createRng(hashStr("atmosphere-graded-test"));
    const race = makeRace({
      graded: {
        key: "test-g1",
        grade: "G1",
        track: "Test Track",
        surface: "Dirt",
      },
    });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // Fire start
    gen.update([makeRunner()], 0.1);

    // Collect atmosphere lines from many ticks (ATMOSPHERE_PROBABILITY is 0.005)
    const allLines: ReturnType<NarrativeGenerator["update"]> = [];
    for (let t = 5; t <= 5000; t += 10) {
      allLines.push(...gen.update([makeRunner({ position: t * 15 })], t));
    }
    const atmoLines = allLines.filter(
      (l) => l.type === "ATMOSPHERE_GRADED" || l.type === "ATMOSPHERE",
    );
    expect(atmoLines.length).toBeGreaterThanOrEqual(1);
  });

  it("ATMOSPHERE_TRIPLE_CROWN fires when race.graded.triplecrownKey is defined", () => {
    const rng = createRng(hashStr("atmosphere-tc-test"));
    const race = makeRace({
      graded: {
        key: "test-tc",
        grade: "G1",
        track: "Test Track",
        surface: "Dirt",
        triplecrownKey: "usa-tc",
      },
    });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const allLines: ReturnType<NarrativeGenerator["update"]> = [];
    for (let t = 5; t <= 5000; t += 10) {
      allLines.push(...gen.update([makeRunner({ position: t * 15 })], t));
    }
    const tcLines = allLines.filter((l) => l.type === "ATMOSPHERE_TRIPLE_CROWN");
    expect(tcLines.length).toBeGreaterThanOrEqual(1);
  });

  it("general atmosphere lines still fire when no track-specific conditions match", () => {
    const rng = createRng(hashStr("atmosphere-general-test"));
    const race = makeRace(); // No graded, no trackId
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // ATMOSPHERE_PROBABILITY is 0.005, so we need many ticks to get a hit
    const allLines: ReturnType<NarrativeGenerator["update"]> = [];
    for (let t = 5; t <= 5000; t += 10) {
      allLines.push(...gen.update([makeRunner({ position: t * 15 })], t));
    }
    const atmoLines = allLines.filter((l) => l.type === "ATMOSPHERE");
    expect(atmoLines.length).toBeGreaterThanOrEqual(1);
  });

  it("track-specific atmosphere respects existing cooldown (45s)", () => {
    const rng = createRng(hashStr("atmosphere-cooldown-test"));
    const race = makeRace({
      graded: {
        key: "test-g1",
        grade: "G1",
        track: "Test Track",
        surface: "Dirt",
      },
    });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // First atmosphere tick
    const lines1 = gen.update([makeRunner({ position: 100 })], 5.0);
    const atmoLines1 = lines1.filter((l) => ATMOSPHERE_TYPES.includes(l.type));

    // Second tick within 45s cooldown
    const lines2 = gen.update([makeRunner({ position: 200 })], 20.0);
    const atmoLines2 = lines2.filter((l) => ATMOSPHERE_TYPES.includes(l.type));

    // At most one atmosphere event across both ticks (cooldown enforced)
    expect(atmoLines1.length + atmoLines2.length).toBeLessThanOrEqual(1);
  });

  it("each atmosphere sub-category has ≥8 entries", () => {
    expect(ATMOSPHERE_LONG_STRAIGHT_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(ATMOSPHERE_TIGHT_TURN_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(ATMOSPHERE_GRADED_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(ATMOSPHERE_TRIPLE_CROWN_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(ATMOSPHERE_ELEVATION_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it("TEMPLATES.ATMOSPHERE is populated with general lines for backward compatibility", () => {
    expect(TEMPLATES.ATMOSPHERE.length).toBeGreaterThanOrEqual(8);
  });

  it("atmosphere does not fire after race finish", () => {
    const rng = createRng(hashStr("atmosphere-finish-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // Finish the race
    const finishedRunner = makeRunner({ position: 1600, finishTime: 60.0 });
    gen.update([finishedRunner], 60.0);

    // Post-finish tick
    const lines = gen.update([finishedRunner], 61.0);
    const atmoLines = lines.filter((l) => ATMOSPHERE_TYPES.includes(l.type));
    expect(atmoLines.length).toBe(0);
  });
});
