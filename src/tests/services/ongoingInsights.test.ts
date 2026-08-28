import { makePlayerOwned } from "@/core/horse/ownership";
import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import {
  MIDRACE_INSIGHT_TEMPLATES,
  CLOSING_INSIGHT_TEMPLATES,
  PACE_ANALYSIS_TEMPLATES,
} from "@/assets/narrative/ongoingInsightTemplates";

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
    name: "Test Horse",
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
    ownership: makePlayerOwned(),
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

const INSIGHT_TYPES = ["MIDRACE_INSIGHT", "CLOSING_INSIGHT", "PACE_ANALYSIS"];

describe("NarrativeGenerator — Ongoing Expert Insights", () => {
  it("MIDRACE_INSIGHT fires at ~50% race progress", () => {
    const rng = createRng(hashStr("ongoing-midrace"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // Start the race
    gen.update([makeRunner()], 0.1);

    // Position at 50% of 1600 = 800m
    const lines = gen.update([makeRunner({ position: 800, velocity: 15 })], 30.0);
    const midraceLines = lines.filter((l) => l.type === "MIDRACE_INSIGHT");
    expect(midraceLines.length).toBeGreaterThanOrEqual(1);
  });

  it("CLOSING_INSIGHT fires at ~80% race progress", () => {
    const rng = createRng(hashStr("ongoing-closing"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // Start the race
    gen.update([makeRunner()], 0.1);

    // Mid-race tick (to set hasAnnouncedMidRaceInsight)
    gen.update([makeRunner({ position: 800, velocity: 15 })], 30.0);

    // Position at 80% of 1600 = 1280m
    const lines = gen.update([makeRunner({ position: 1280, velocity: 15 })], 50.0);
    const closingLines = lines.filter((l) => l.type === "CLOSING_INSIGHT");
    expect(closingLines.length).toBeGreaterThanOrEqual(1);
  });

  it("insights include {jockey} and {horse} placeholders, both replaced", () => {
    const rng = createRng(hashStr("ongoing-placeholders"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity({ name: "Lightning Bolt" });
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner({ name: "Lightning Bolt", jockeyName: "Frankie Dettori" })], 0.1);

    const lines = gen.update(
      [
        makeRunner({
          name: "Lightning Bolt",
          jockeyName: "Frankie Dettori",
          position: 800,
          velocity: 15,
        }),
      ],
      30.0,
    );
    const midraceLines = lines.filter((l) => l.type === "MIDRACE_INSIGHT");
    expect(midraceLines.length).toBeGreaterThanOrEqual(1);
    expect(midraceLines[0].text).not.toContain("{horse}");
    expect(midraceLines[0].text).not.toContain("{jockey}");
    expect(midraceLines[0].text).toContain("Lightning Bolt");
    expect(midraceLines[0].text).toContain("Frankie Dettori");
  });

  it("insights do not fire after race finish", () => {
    const rng = createRng(hashStr("ongoing-finish"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // Start + finish
    gen.update([makeRunner()], 0.1);
    gen.update([makeRunner({ position: 1600, finishTime: 60.0 })], 60.0);

    // Post-finish tick at midrace position (should not fire)
    const lines = gen.update([makeRunner({ position: 800, velocity: 15 })], 61.0);
    const insightLines = lines.filter((l) => INSIGHT_TYPES.includes(l.type));
    expect(insightLines.length).toBe(0);
  });

  it("insights do not fire before race start", () => {
    const rng = createRng(hashStr("ongoing-before-start"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // simTime=0 — start hasn't been announced yet
    const lines = gen.update([makeRunner({ position: 800, velocity: 15 })], 0);
    const insightLines = lines.filter((l) => INSIGHT_TYPES.includes(l.type));
    expect(insightLines.length).toBe(0);
  });

  it("each insight template array has ≥12 entries", () => {
    expect(MIDRACE_INSIGHT_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(CLOSING_INSIGHT_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(PACE_ANALYSIS_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it("MIDRACE_INSIGHT fires only once per race", () => {
    const rng = createRng(hashStr("ongoing-once"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // First mid-race tick
    const lines1 = gen.update([makeRunner({ position: 800, velocity: 15 })], 30.0);
    const midrace1 = lines1.filter((l) => l.type === "MIDRACE_INSIGHT");

    // Second tick at 50%+ progress
    const lines2 = gen.update([makeRunner({ position: 900, velocity: 15 })], 35.0);
    const midrace2 = lines2.filter((l) => l.type === "MIDRACE_INSIGHT");

    // Should fire at most once
    expect(midrace1.length + midrace2.length).toBeLessThanOrEqual(1);
  });
});
