import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import { makePlayerOwned } from "@/core/horse/ownership";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 0,
    fieldSize: 3,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

function makeHorseEntity(overrides: Omit<Partial<Horse>, "id"> & { id?: string } = {}): Horse {
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

function makeRunnerWithHorse(horse: Horse, overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: horse.id,
    name: horse.name,
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
    horse,
    jockeyName: "Test Jockey",
    ...overrides,
  } as Runner;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Condition sort ordering — multi-condition characterization", () => {
  // Helper: create a generator with horses and stables
  function makeGenerator(
    horses: Horse[],
    stables: Stable[] = [makeStable()],
    raceOverrides: Partial<Race> = {},
  ) {
    const race = makeRace(raceOverrides);
    const rng = createRng(hashStr("condition-sort-test"));
    const gen = new NarrativeGenerator(race, horses, stables, rng);
    return { gen, race, rng };
  }

  // --- Test 1: Battling wins over Flying when both are emphatic ---
  // Both flying (emphatic=true, tone=positive, priority=2) and
  // battling (emphatic=true, tone=caution, priority=1) can co-exist.
  // Since both are emphatic, the tiebreaker is TONE_PRIORITY:
  // caution (1) < positive (2), so battling should win.
  it("prefers BATTLING over FLYING when both fire simultaneously (both emphatic, caution < positive)", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const horseC = makeHorseEntity({ id: "h3", name: "Horse C" });
    const { gen } = makeGenerator([horseA, horseB, horseC]);

    // Tick 0: all at position 0, equal velocities — no conditions trigger
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseC, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // Tick 1: A and B are neck-and-neck at 50% progress, both fast.
    // C is slow and behind, lowering the field mean.
    // A: velocity=18, B: velocity=17.8, C: velocity=14
    // Mean = (18 + 17.8 + 14) / 3 = 16.6
    // A: fieldRatio = 18/16.6 ≈ 1.084 ≥ 1.06 → flying ✓
    //    gap to B = 0 < 1.8, |17.8-18| = 0.2 < 0.45, progress=0.5 > 0.45 → battling ✓
    // Both emphatic → sort by TONE_PRIORITY: battling (caution=1) < flying (positive=2)
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 800 }),
        makeRunnerWithHorse(horseB, { velocity: 17.8, position: 800 }),
        makeRunnerWithHorse(horseC, { velocity: 14, position: 300 }),
      ],
      1.0,
    );

    // h1 should get BATTLING (not FLYING) because battling has higher tone priority
    const h1Battling = lines.filter((l) => l.type === "BATTLING" && l.horseId === "h1");
    const h1Flying = lines.filter((l) => l.type === "FLYING" && l.horseId === "h1");
    expect(h1Battling.length).toBe(1);
    expect(h1Flying.length).toBe(0);
  });

  // --- Test 2: FLYING fires when it's the only new condition ---
  // Verifies that when only flying triggers (no battling), FLYING is announced.
  it("fires FLYING when it is the only new condition (no battling)", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Tick 0: equal velocities, no conditions
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // Tick 1: A is fast and ahead, B is slow and far behind.
    // A: velocity=18, B: velocity=15
    // Mean = (18 + 15) / 2 = 16.5
    // A: fieldRatio = 18/16.5 ≈ 1.09 ≥ 1.06 → flying ✓
    // A: progress = 320/1600 = 0.2 < 0.45 → no battling (below min progress)
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 320 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 300 }),
      ],
      1.0,
    );

    const h1Flying = lines.filter((l) => l.type === "FLYING" && l.horseId === "h1");
    expect(h1Flying.length).toBe(1);
  });
});
