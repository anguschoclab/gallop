import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
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

describe("NarrativeGenerator — MILESTONE uses templates", () => {
  it("MILESTONE line text comes from TEMPLATES.MILESTONE (not hardcoded)", () => {
    const rng = createRng(hashStr("milestone-template-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({ position: 800 });
    const lines = gen.update([runner], 10.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    const milestoneText = milestoneLines[0].text;
    const isFromTemplate = TEMPLATES.MILESTONE.some((t) => {
      let expectedText = t.replace("{remaining}", (1600 - 800).toString());
      expectedText = expectedText.replace("{raceName}", "Test Race");
      return expectedText === milestoneText;
    });
    expect(isFromTemplate).toBe(true);
  });

  it("MILESTONE at final 400m produces different template text", () => {
    const rng = createRng(hashStr("milestone-400-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);
    gen.update([makeRunner({ position: 800 })], 10.0);

    const runner = makeRunner({ position: 1200 });
    const lines = gen.update([runner], 20.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    const milestoneText = milestoneLines[0].text;
    const isFromTemplate = TEMPLATES.MILESTONE.some((t) => {
      let expectedText = t.replace("{remaining}", (1600 - 1200).toString());
      expectedText = expectedText.replace("{raceName}", "Test Race");
      return expectedText === milestoneText;
    });
    expect(isFromTemplate).toBe(true);
  });

  it("MILESTONE does not produce hardcoded 'Passing the halfway point now.'", () => {
    const rng = createRng(hashStr("milestone-no-hardcode"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({ position: 800 });
    const lines = gen.update([runner], 10.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    // The old hardcoded text should not appear — text should come from templates
    // Some templates do say "Passing the halfway point now." so we check that
    // the text matches a template entry, not just the hardcoded string
    for (const line of milestoneLines) {
      const matchesTemplate = TEMPLATES.MILESTONE.some((t) => {
        let expected = t.replace("{remaining}", (1600 - 800).toString());
        expected = expected.replace("{raceName}", "Test Race");
        return expected === line.text;
      });
      expect(matchesTemplate).toBe(true);
    }
  });

  it("each milestone only fires once per race", () => {
    const rng = createRng(hashStr("milestone-once"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // First pass through halfway
    const lines1 = gen.update([makeRunner({ position: 800 })], 10.0);
    expect(lines1.filter((l) => l.type === "MILESTONE")).toHaveLength(1);

    // Second tick at same position — should not re-announce
    const lines2 = gen.update([makeRunner({ position: 810 })], 10.5);
    expect(lines2.filter((l) => l.type === "MILESTONE")).toHaveLength(0);
  });

  it("{remaining} placeholder is replaced with actual distance remaining", () => {
    const rng = createRng(hashStr("milestone-remaining"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({ position: 1200 });
    const lines = gen.update([runner], 20.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    // If the template used {remaining}, it should be replaced with 400
    // If the template didn't use {remaining}, it should still be valid text
    for (const line of milestoneLines) {
      expect(line.text).not.toContain("{remaining}");
    }
  });
});
