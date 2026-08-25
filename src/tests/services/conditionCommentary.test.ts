import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import { TEMPLATES } from "@/assets/narrative/templates";

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
    fieldSize: 2,
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

describe("Condition commentary integration", () => {
  // Helper: create a generator with horses and stables
  function makeGenerator(
    horses: Horse[],
    stables: Stable[] = [makeStable()],
    raceOverrides: Partial<Race> = {},
  ) {
    const race = makeRace(raceOverrides);
    const rng = createRng(hashStr("condition-test"));
    const gen = new NarrativeGenerator(race, horses, stables, rng);
    return { gen, race, rng };
  }

  // --- Test 1: FLYING transition ---
  it("fires FLYING commentary on first transition to flying condition", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Tick 0: start — equal velocities so no conditions trigger
    const r0 = [
      makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
      makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
    ];
    gen.update(r0, 0.1);

    // Tick 1: A is flying (fieldRatio = 18/16.5 ≈ 1.09 ≥ 1.06, fadeRatio = 18/18 = 1.0 > 0.97)
    // Position at 20% of 1600 = 320m
    const r1 = [
      makeRunnerWithHorse(horseA, { velocity: 18, position: 320 }),
      makeRunnerWithHorse(horseB, { velocity: 15, position: 300 }),
    ];
    const lines = gen.update(r1, 1.0);

    expect(lines.some((l) => l.type === "FLYING" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 2: No re-fire while condition persists ---
  it("does not re-fire FLYING while condition persists", () => {
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

    // Tick 1: enter flying
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 320 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 300 }),
      ],
      1.0,
    );

    // Same conditions — should NOT fire again
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 340 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 310 }),
      ],
      2.0,
    );

    expect(lines.some((l) => l.type === "FLYING")).toBe(false);
  });

  // --- Test 3: Re-fire after exit and re-entry ---
  it("re-fires FLYING after exit and re-entry (subject to cooldown)", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start — equal velocities, no conditions
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // Enter flying
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 320 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 300 }),
      ],
      1.0,
    );

    // Exit flying (velocity drops)
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 340 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 320 }),
      ],
      2.0,
    );

    // Re-enter flying after cooldown (30s)
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 360 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 340 }),
      ],
      35.0,
    );

    expect(lines.some((l) => l.type === "FLYING" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 4: Cooldown enforcement ---
  it("enforces cooldown — no re-fire within 30s for FLYING", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start — equal velocities, no conditions
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // Enter flying at t=1
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 320 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 300 }),
      ],
      1.0,
    );

    // Exit
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 340 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 320 }),
      ],
      2.0,
    );

    // Re-enter within cooldown (30s) — should NOT fire
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 360 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 340 }),
      ],
      5.0,
    );

    expect(lines.some((l) => l.type === "FLYING")).toBe(false);
  });

  // --- Test 5: BATTLING transition ---
  it("fires BATTLING commentary on transition to battling condition", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 0 }),
      ],
      0.1,
    );

    // Both at same position (720m = 45% of 1600), gap < 1.8m, velocities within 0.45
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 720 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 721 }),
      ],
      10.0,
    );

    expect(lines.some((l) => l.type === "BATTLING")).toBe(true);
  });

  // --- Test 6: BOXED_IN transition ---
  it("fires BOXED_IN commentary on transition to boxed condition", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 0 }),
      ],
      0.1,
    );

    // A at 500m (31%), B at 502m (2m ahead, 0.3 < 2 < 3.2), same lane
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 500, lane: 1 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 502, lane: 1 }),
      ],
      10.0,
    );

    expect(lines.some((l) => l.type === "BOXED_IN" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 7: FLAGGING transition ---
  it("fires FLAGGING commentary on transition to flagging condition", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start with high velocity to set peak
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 17, position: 0 }),
      ],
      0.1,
    );

    // A drops to 16.5 (fadeRatio = 16.5/18 ≈ 0.917 < 0.92)
    // fieldRatio = 16.5/17 ≈ 0.97 < 0.99, progress = 640/1600 = 0.4 > 0.35
    // Must NOT trigger distressed (fadeRatio ≥ 0.8)
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16.5, position: 640 }),
        makeRunnerWithHorse(horseB, { velocity: 17, position: 650 }),
      ],
      20.0,
    );

    expect(lines.some((l) => l.type === "FLAGGING" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 8: IN_TROUBLE transition ---
  it("fires IN_TROUBLE commentary on transition to distressed condition", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start with high velocity
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 17, position: 0 }),
      ],
      0.1,
    );

    // A drops sharply: velocity 13 (fadeRatio = 13/18 ≈ 0.72 < 0.8)
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 13, position: 400 }),
        makeRunnerWithHorse(horseB, { velocity: 17, position: 410 }),
      ],
      15.0,
    );

    expect(lines.some((l) => l.type === "IN_TROUBLE" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 9: AILING transition ---
  it("fires AILING commentary for runner with activeInjury", () => {
    const horseA = makeHorseEntity({
      id: "h1",
      name: "Horse A",
      activeInjury: {
        type: "tendon",
        severity: "moderate",
        recoveryDays: 30,
        onsetDay: 5,
      },
    });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Tick 0: ailing fires on first tick since activeInjury is present
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    expect(lines.some((l) => l.type === "AILING" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 10: AILING fires independently ---
  it("fires BOTH AILING and FLYING when runner has activeInjury and is flying", () => {
    const horseA = makeHorseEntity({
      id: "h1",
      name: "Horse A",
      activeInjury: {
        type: "tendon",
        severity: "moderate",
        recoveryDays: 30,
        onsetDay: 5,
      },
    });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Tick 0: both ailing and fire on first tick
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    expect(lines.some((l) => l.type === "AILING" && l.horseId === "h1")).toBe(true);
    expect(lines.some((l) => l.type === "FLYING" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 11: SETTLED transition ---
  it("fires SETTLED commentary on transition to settled condition", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 0 }),
      ],
      0.1,
    );

    // Both at velocity 16, field mean 16, fieldRatio = 1.0 (|1.0-1| < 0.04)
    // Position at 20% = 320m (0.1 < 0.2 < 0.6), no other conditions
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 320 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 310 }),
      ],
      5.0,
    );

    expect(lines.some((l) => l.type === "SETTLED")).toBe(true);
  });

  // --- Test 12: GRINDING transition ---
  it("fires GRINDING commentary on transition to grinding condition", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start at velocity 16 to set peak
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 0 }),
      ],
      0.1,
    );

    // A at 1200m (75% > 0.7), velocity 16, field mean 16 (fieldRatio ≥ 0.99)
    // fadeRatio = 16/16 = 1.0 < 1.02, behindLeader < 6 lengths
    // Leader at 1214m, behindLeader = (1214-1200)/2.4 = 5.8 < 6
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 16, position: 1200 }),
        makeRunnerWithHorse(horseB, { velocity: 16, position: 1214 }),
      ],
      40.0,
    );

    expect(lines.some((l) => l.type === "GRINDING" && l.horseId === "h1")).toBe(true);
  });

  // --- Test 13: Finished runner gets no condition commentary ---
  it("does not fire condition commentary for finished runners", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start — equal velocities, no conditions
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // A finishes but is still "flying" velocity-wise
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 1600, finishTime: 60.0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 1500 }),
      ],
      60.0,
    );

    expect(lines.some((l) => l.type === "FLYING" && l.horseId === "h1")).toBe(false);
  });

  // --- Test 14: After race finish, no condition commentary ---
  it("does not fire condition commentary after race finish is announced", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // Finish
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 1600, finishTime: 60.0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 1500 }),
      ],
      60.0,
    );

    // Post-finish — A would be flying but finish is announced
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 1600, finishTime: 60.0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 1600, finishTime: 61.0 }),
      ],
      61.0,
    );

    expect(lines.some((l) => l.type === "FLYING")).toBe(false);
  });

  // --- Test 15: Multiple runners fire different conditions ---
  it("fires different condition commentary for different runners in same tick", () => {
    const horseA = makeHorseEntity({
      id: "h1",
      name: "Horse A",
      activeInjury: {
        type: "tendon",
        severity: "moderate",
        recoveryDays: 30,
        onsetDay: 5,
      },
    });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Tick 0: A is ailing (activeInjury), B is settled (fieldRatio ≈ 1.0, progress 0.2)
    // Both fire on first tick since conditions are new
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 320 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 310 }),
      ],
      5.0,
    );

    expect(lines.some((l) => l.type === "AILING" && l.horseId === "h1")).toBe(true);
    expect(lines.some((l) => l.type === "SETTLED" && l.horseId === "h2")).toBe(true);
  });

  // --- Test 16: Single non-ailing condition per runner (priority) ---
  it("fires only highest-priority non-ailing condition when multiple new conditions appear", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start — equal velocities, no conditions
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // A is flying (emphatic, positive) AND boxed (not emphatic, caution)
    // A at 500m (31%), B at 502m (2m ahead), same lane → boxed
    // A velocity 18, B velocity 15, fieldRatio = 18/16.5 ≈ 1.09 ≥ 1.06 → flying
    // flying (emphatic) should win over boxed (not emphatic)
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 500, lane: 1 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 502, lane: 1 }),
      ],
      10.0,
    );

    const flyingLines = lines.filter((l) => l.type === "FLYING" && l.horseId === "h1");
    const boxedLines = lines.filter((l) => l.type === "BOXED_IN" && l.horseId === "h1");
    expect(flyingLines.length).toBe(1);
    expect(boxedLines.length).toBe(0);
  });

  // --- Test 17: Template count validation ---
  it("each new condition event type has at least 12 template entries", () => {
    expect(TEMPLATES.FLYING.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.BATTLING.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.BOXED_IN.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.GRINDING.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.FLAGGING.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.IN_TROUBLE.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.AILING.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.SETTLED.length).toBeGreaterThanOrEqual(12);
  });

  // --- Test 18: Placeholder substitution ---
  it("new condition template lines do not contain unreplaced {horse} placeholders", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start — equal velocities, no conditions
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    // Trigger flying
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 18, position: 320 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 300 }),
      ],
      1.0,
    );

    const conditionLines = lines.filter((l) =>
      [
        "FLYING",
        "BATTLING",
        "BOXED_IN",
        "GRINDING",
        "FLAGGING",
        "IN_TROUBLE",
        "AILING",
        "SETTLED",
      ].includes(l.type),
    );

    for (const line of conditionLines) {
      expect(line.text).not.toContain("{horse}");
      expect(line.text).not.toContain("{");
    }
  });

  // --- Test 19: isHighImpact flag ---
  it("sets isHighImpact=true for FLYING, BATTLING, and IN_TROUBLE lines", () => {
    const horseA = makeHorseEntity({ id: "h1", name: "Horse A" });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Start — equal velocities, no conditions
    gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 17, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 17, position: 0 }),
      ],
      0.1,
    );

    // A drops to 13 (fadeRatio = 13/18 ≈ 0.72 < 0.8 → distressed → IN_TROUBLE)
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 13, position: 400 }),
        makeRunnerWithHorse(horseB, { velocity: 17, position: 410 }),
      ],
      15.0,
    );

    const troubleLines = lines.filter((l) => l.type === "IN_TROUBLE");
    expect(troubleLines.length).toBeGreaterThan(0);
    expect(troubleLines[0].isHighImpact).toBe(true);
  });

  // --- Test 20: AILING not high-impact ---
  it("does NOT set isHighImpact for AILING, BOXED_IN, GRINDING, FLAGGING, SETTLED lines", () => {
    const horseA = makeHorseEntity({
      id: "h1",
      name: "Horse A",
      activeInjury: {
        type: "tendon",
        severity: "moderate",
        recoveryDays: 30,
        onsetDay: 5,
      },
    });
    const horseB = makeHorseEntity({ id: "h2", name: "Horse B" });
    const { gen } = makeGenerator([horseA, horseB]);

    // Tick 0: ailing fires on first tick since activeInjury is present
    const lines = gen.update(
      [
        makeRunnerWithHorse(horseA, { velocity: 15, position: 0 }),
        makeRunnerWithHorse(horseB, { velocity: 15, position: 0 }),
      ],
      0.1,
    );

    const ailingLines = lines.filter((l) => l.type === "AILING");
    expect(ailingLines.length).toBeGreaterThan(0);
    expect(ailingLines[0].isHighImpact).not.toBe(true);
  });
});
