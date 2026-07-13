import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";

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
    owned: true,
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

// Expected velocity for 1600m race: 18.5 - (1600/3000) * 2.5 = 18.5 - 1.33 = 17.17
// paceRating = leaderVelocity / expectedVel
// For paceRating > 1.1, need velocity > 17.17 * 1.1 = 18.89
const HOT_VELOCITY = 20;
const NORMAL_VELOCITY = 15;

describe("NarrativeGenerator — HOT_PACE detection", () => {
  it("emits HOT_PACE when leader velocity is significantly above expected", () => {
    const rng = createRng(hashStr("hot-pace-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // First tick to announce start
    gen.update([makeRunner({ velocity: HOT_VELOCITY })], 0.1);

    // Second tick with hot pace
    const lines = gen.update(
      [makeRunner({ velocity: HOT_VELOCITY, position: 50 })],
      1.0,
    );

    expect(lines.some((l) => l.type === "HOT_PACE")).toBe(true);
  });

  it("does not emit HOT_PACE when velocity is normal", () => {
    const rng = createRng(hashStr("normal-pace-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner({ velocity: NORMAL_VELOCITY })], 0.1);

    const lines = gen.update(
      [makeRunner({ velocity: NORMAL_VELOCITY, position: 50 })],
      1.0,
    );

    expect(lines.some((l) => l.type === "HOT_PACE")).toBe(false);
  });

  it("HOT_PACE respects cooldown — not emitted twice in quick succession", () => {
    const rng = createRng(hashStr("hot-pace-cooldown"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner({ velocity: HOT_VELOCITY })], 0.1);

    // First hot pace emission
    const lines1 = gen.update(
      [makeRunner({ velocity: HOT_VELOCITY, position: 50 })],
      1.0,
    );
    expect(lines1.some((l) => l.type === "HOT_PACE")).toBe(true);

    // Second tick shortly after — should NOT emit again (within cooldown)
    const lines2 = gen.update(
      [makeRunner({ velocity: HOT_VELOCITY, position: 100 })],
      2.0,
    );
    expect(lines2.some((l) => l.type === "HOT_PACE")).toBe(false);
  });

  it("HOT_PACE not emitted after race is finished", () => {
    const rng = createRng(hashStr("hot-pace-finished"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // Start
    gen.update([makeRunner({ velocity: HOT_VELOCITY })], 0.1);

    // Finish the race
    const finishedRunner = makeRunner({
      velocity: HOT_VELOCITY,
      position: 1600,
      finishTime: 95.5,
    });
    gen.update([finishedRunner], 5.0);

    // After finish — should not emit HOT_PACE
    const lines = gen.update(
      [makeRunner({ velocity: HOT_VELOCITY, position: 1600, finishTime: 95.5 })],
      6.0,
    );

    expect(lines.some((l) => l.type === "HOT_PACE")).toBe(false);
  });

  it("HOT_PACE only emitted early in the race (before 60% progress)", () => {
    const rng = createRng(hashStr("hot-pace-late"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner({ velocity: HOT_VELOCITY })], 0.1);

    // At 70% of race distance with hot velocity — should not trigger
    const lines = gen.update(
      [makeRunner({ velocity: HOT_VELOCITY, position: 1120 })],
      50.0,
    );

    expect(lines.some((l) => l.type === "HOT_PACE")).toBe(false);
  });
});
