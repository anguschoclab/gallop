import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import { TEMPLATES, EXPERT_INSIGHT_TEMPLATES } from "@/assets/narrative/templates";

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

describe("NarrativeGenerator", () => {
  it("emits START and EXPERT_INSIGHT on first update after t=0", () => {
    const rng = createRng(hashStr("test-seed"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    const runner = makeRunner();
    const lines = gen.update([runner], 0.1);

    expect(lines.some((l) => l.type === "START")).toBe(true);
    expect(lines.some((l) => l.type === "EXPERT_INSIGHT")).toBe(true);
  });

  it("emits FINISH exactly once when leader has finishTime", () => {
    const rng = createRng(hashStr("test-seed"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // First tick to announce start
    gen.update([makeRunner()], 0.1);

    const finishedRunner = makeRunner({ position: 1600, finishTime: 95.5 });
    const lines1 = gen.update([finishedRunner], 5.0);
    expect(lines1.some((l) => l.type === "FINISH")).toBe(true);

    // Second tick should not emit FINISH again
    const lines2 = gen.update([finishedRunner], 5.1);
    expect(lines2.some((l) => l.type === "FINISH")).toBe(false);
  });

  it("emits MILESTONE at halfway point", () => {
    const rng = createRng(hashStr("test-seed"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({ position: 800 });
    const lines = gen.update([runner], 10.0);

    expect(lines.some((l) => l.type === "MILESTONE")).toBe(true);
    const milestoneText = lines.find((l) => l.type === "MILESTONE")!.text;
    const isFromTemplate = TEMPLATES.MILESTONE.some((t) => {
      let expected = t.replace("{remaining}", (1600 - 800).toString());
      expected = expected.replace("{raceName}", "Test Race");
      return expected === milestoneText;
    });
    expect(isFromTemplate).toBe(true);
  });

  it("prevents duplicate LEAD_CHANGE for the same new leader within cooldown", () => {
    const rng = createRng(hashStr("test-seed"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    const runnerA = makeRunner({ horseId: "h1", position: 100 });
    const runnerB = makeRunner({ horseId: "h2", position: 50 });

    // First tick: establish A as leader
    gen.update([runnerA, runnerB], 0.1);

    // Second tick: B takes lead past threshold
    const lines1 = gen.update(
      [
        { ...runnerB, position: 110 },
        { ...runnerA, position: 100 },
      ],
      1.0,
    );
    expect(lines1.filter((l) => l.type === "LEAD_CHANGE")).toHaveLength(1);

    // Third tick: B stays leader — should NOT fire again for B within 15s cooldown
    const lines2 = gen.update(
      [
        { ...runnerB, position: 120 },
        { ...runnerA, position: 110 },
      ],
      2.0,
    );
    expect(lines2.filter((l) => l.type === "LEAD_CHANGE")).toHaveLength(0);

    // Fourth tick: A takes lead back — different key, so allowed
    const lines3 = gen.update(
      [
        { ...runnerA, position: 130 },
        { ...runnerB, position: 120 },
      ],
      20.0,
    );
    expect(lines3.filter((l) => l.type === "LEAD_CHANGE")).toHaveLength(1);
  });

  it("emits STRETCH when leader passes 85% of race distance", () => {
    const rng = createRng(hashStr("test-seed"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({ position: 1400 }); // > 85% of 1600
    const lines = gen.update([runner], 80.0);

    expect(lines.some((l) => l.type === "STRETCH")).toBe(true);
  });
});

describe("template variety (herald branches)", () => {
  it("START templates contain at least 5 entries", () => {
    expect(TEMPLATES.START.length).toBeGreaterThanOrEqual(5);
  });

  it("STRETCH templates contain at least 8 entries", () => {
    expect(TEMPLATES.STRETCH.length).toBeGreaterThanOrEqual(8);
  });

  it("FINISH templates contain at least 7 entries", () => {
    expect(TEMPLATES.FINISH.length).toBeGreaterThanOrEqual(7);
  });

  it("GAP_ANNOUNCEMENT templates contain at least 4 entries", () => {
    expect(TEMPLATES.GAP_ANNOUNCEMENT.length).toBeGreaterThanOrEqual(4);
  });

  it("EXPERT_INSIGHT_TEMPLATES have expanded entries", () => {
    expect(EXPERT_INSIGHT_TEMPLATES.POSITIVE_FORM.length).toBeGreaterThanOrEqual(4);
    expect(EXPERT_INSIGHT_TEMPLATES.NEGATIVE_FORM.length).toBeGreaterThanOrEqual(4);
    expect(EXPERT_INSIGHT_TEMPLATES.DISTANCE_FIT.length).toBeGreaterThanOrEqual(4);
    expect(EXPERT_INSIGHT_TEMPLATES.NEW_DISTANCE.length).toBeGreaterThanOrEqual(4);
  });

  it("no STRETCH template contains 'Nothing separates'", () => {
    for (const t of TEMPLATES.STRETCH) {
      expect(t).not.toContain("Nothing separates");
    }
  });

  it("no FINISH template contains 'clings on'", () => {
    for (const t of TEMPLATES.FINISH) {
      expect(t).not.toContain("clings on");
    }
  });
});
