import { makePlayerOwned } from "@/core/horse/ownership";
import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { RaceContext } from "@/services/narrative/types";
import { createRng, hashStr } from "@/core/common/rng";
import {
  DEFENDING_CHAMPION_TEMPLATES,
  TRACK_RECORD_TEMPLATES,
  RETURNING_RUNNER_TEMPLATES,
  COURSE_SPECIALIST_TEMPLATES,
} from "@/assets/narrative/raceContextTemplates";

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

const RACE_CONTEXT_TYPES = [
  "DEFENDING_CHAMPION",
  "TRACK_RECORD",
  "RETURNING_RUNNER",
  "COURSE_SPECIALIST",
];

describe("NarrativeGenerator — Race-Specific Context", () => {
  it("DEFENDING_CHAMPION fires when a horse is the defending champion", () => {
    const rng = createRng(hashStr("race-context-champion"));
    const race = makeRace();
    const horse = makeHorseEntity({ name: "Champion Horse" });
    const stable = makeStable();
    const raceContext: RaceContext = {
      defendingChampion: { horseName: "Champion Horse", year: 2023 },
      previousFinishPositions: {},
      horseCourseVisits: {},
    };
    const gen = new NarrativeGenerator(race, [horse], [stable], rng, raceContext);

    const lines = gen.update([makeRunner({ name: "Champion Horse" })], 0.1);
    const champLines = lines.filter((l) => l.type === "DEFENDING_CHAMPION");
    expect(champLines.length).toBeGreaterThanOrEqual(1);
    expect(champLines[0].text).toContain("Champion Horse");
  });

  it("RETURNING_RUNNER fires when a horse has a previous finish position", () => {
    const rng = createRng(hashStr("race-context-returning"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const raceContext: RaceContext = {
      previousFinishPositions: { h1: 3 },
      horseCourseVisits: {},
    };
    const gen = new NarrativeGenerator(race, [horse], [stable], rng, raceContext);

    const lines = gen.update([makeRunner()], 0.1);
    const returningLines = lines.filter((l) => l.type === "RETURNING_RUNNER");
    expect(returningLines.length).toBeGreaterThanOrEqual(1);
    expect(returningLines[0].text).toContain("3");
  });

  it("COURSE_SPECIALIST fires when a horse has courseVisits >= 3", () => {
    const rng = createRng(hashStr("race-context-specialist"));
    const race = makeRace();
    const horse = makeHorseEntity({ courseVisits: { track1: 5 } });
    const stable = makeStable();
    const raceContext: RaceContext = {
      previousFinishPositions: {},
      horseCourseVisits: { h1: 5 },
    };
    const gen = new NarrativeGenerator(race, [horse], [stable], rng, raceContext);

    const lines = gen.update([makeRunner()], 0.1);
    const specialistLines = lines.filter((l) => l.type === "COURSE_SPECIALIST");
    expect(specialistLines.length).toBeGreaterThanOrEqual(1);
    expect(specialistLines[0].text).toContain("5");
  });

  it("TRACK_RECORD fires when leader is on pace during stretch run", () => {
    const rng = createRng(hashStr("race-context-track-record"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const raceContext: RaceContext = {
      trackRecordTime: 90.0, // 90 seconds for 1600m
      trackRecordHolder: "Legendary Horse",
      previousFinishPositions: {},
      horseCourseVisits: {},
    };
    const gen = new NarrativeGenerator(race, [horse], [stable], rng, raceContext);

    // Start the race
    gen.update([makeRunner()], 0.1);

    // Run to stretch — position > 85% of distance (1360m), at a fast pace
    // At simTime=60, position=1400m → projected = 60/1400 * 1600 ≈ 68.6s < 90s
    const lines = gen.update([makeRunner({ position: 1400, velocity: 22 })], 60.0);
    const recordLines = lines.filter((l) => l.type === "TRACK_RECORD");
    expect(recordLines.length).toBeGreaterThanOrEqual(1);
  });

  it("no race context lines fire when RaceContext is empty", () => {
    const rng = createRng(hashStr("race-context-empty"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const raceContext: RaceContext = {
      previousFinishPositions: {},
      horseCourseVisits: {},
    };
    const gen = new NarrativeGenerator(race, [horse], [stable], rng, raceContext);

    const lines = gen.update([makeRunner()], 0.1);
    const contextLines = lines.filter((l) => RACE_CONTEXT_TYPES.includes(l.type));
    expect(contextLines.length).toBe(0);
  });

  it("no race context lines fire when RaceContext is undefined", () => {
    const rng = createRng(hashStr("race-context-undefined"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    const lines = gen.update([makeRunner()], 0.1);
    const contextLines = lines.filter((l) => RACE_CONTEXT_TYPES.includes(l.type));
    expect(contextLines.length).toBe(0);
  });

  it("each race context template array has ≥12 entries", () => {
    expect(DEFENDING_CHAMPION_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(TRACK_RECORD_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(RETURNING_RUNNER_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(COURSE_SPECIALIST_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });
});
