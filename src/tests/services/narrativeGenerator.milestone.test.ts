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

describe("NarrativeGenerator — MILESTONE uses templates", () => {
  it("MILESTONE_HALFWAY fires at halfway point with specific event type", () => {
    const rng = createRng(hashStr("milestone-template-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({ position: 800 });
    const lines = gen.update([runner], 10.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE_HALFWAY");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    const milestoneText = milestoneLines[0].text;
    const isFromTemplate = TEMPLATES.MILESTONE_HALFWAY.some((t) => {
      let expectedText = t.replace("{remaining}", (1600 - 800).toString());
      expectedText = expectedText.replace("{raceName}", "Test Race");
      return expectedText === milestoneText;
    });
    expect(isFromTemplate).toBe(true);
  });

  it("MILESTONE_FINAL_400 fires at final 400m with specific event type", () => {
    const rng = createRng(hashStr("milestone-400-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);
    gen.update([makeRunner({ position: 800 })], 10.0);

    const runner = makeRunner({ position: 1200 });
    const lines = gen.update([runner], 20.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE_FINAL_400");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    const milestoneText = milestoneLines[0].text;
    const isFromTemplate = TEMPLATES.MILESTONE_FINAL_400.some((t) => {
      let expectedText = t.replace("{remaining}", (1600 - 1200).toString());
      expectedText = expectedText.replace("{raceName}", "Test Race");
      return expectedText === milestoneText;
    });
    expect(isFromTemplate).toBe(true);
  });

  it("MILESTONE_FINAL_200 fires at final 200m with specific event type", () => {
    const rng = createRng(hashStr("milestone-200-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);
    gen.update([makeRunner({ position: 800 })], 10.0);
    gen.update([makeRunner({ position: 1200 })], 20.0);

    const runner = makeRunner({ position: 1400 });
    const lines = gen.update([runner], 30.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE_FINAL_200");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    const milestoneText = milestoneLines[0].text;
    const isFromTemplate = TEMPLATES.MILESTONE_FINAL_200.some((t) => {
      let expectedText = t.replace("{remaining}", (1600 - 1400).toString());
      expectedText = expectedText.replace("{raceName}", "Test Race");
      return expectedText === milestoneText;
    });
    expect(isFromTemplate).toBe(true);
  });

  it("MILESTONE_FINAL_100 fires at final 100m with specific event type", () => {
    const rng = createRng(hashStr("milestone-100-test"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);
    gen.update([makeRunner({ position: 800 })], 10.0);
    gen.update([makeRunner({ position: 1200 })], 20.0);
    gen.update([makeRunner({ position: 1400 })], 30.0);

    const runner = makeRunner({ position: 1500 });
    const lines = gen.update([runner], 35.0);

    const milestoneLines = lines.filter((l) => l.type === "MILESTONE_FINAL_100");
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    const milestoneText = milestoneLines[0].text;
    const isFromTemplate = TEMPLATES.MILESTONE_FINAL_100.some((t) => {
      let expectedText = t.replace("{remaining}", (1600 - 1500).toString());
      expectedText = expectedText.replace("{raceName}", "Test Race");
      return expectedText === milestoneText;
    });
    expect(isFromTemplate).toBe(true);
  });

  it("each specific milestone template array has ≥12 entries", () => {
    expect(TEMPLATES.MILESTONE_HALFWAY.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.MILESTONE_FINAL_400.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.MILESTONE_FINAL_200.length).toBeGreaterThanOrEqual(12);
    expect(TEMPLATES.MILESTONE_FINAL_100.length).toBeGreaterThanOrEqual(12);
  });

  it("specific milestone text comes from the correct sub-template array, not TEMPLATES.MILESTONE", () => {
    const rng = createRng(hashStr("milestone-correct-array"));
    const race = makeRace({ distance: 1600 });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({ position: 800 });
    const lines = gen.update([runner], 10.0);

    const halfwayLines = lines.filter((l) => l.type === "MILESTONE_HALFWAY");
    expect(halfwayLines.length).toBeGreaterThanOrEqual(1);

    for (const line of halfwayLines) {
      const matchesHalfway = TEMPLATES.MILESTONE_HALFWAY.some((t) => {
        let expected = t.replace("{remaining}", (1600 - 800).toString());
        expected = expected.replace("{raceName}", "Test Race");
        return expected === line.text;
      });
      expect(matchesHalfway).toBe(true);
    }
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

    const milestoneLines = lines.filter(
      (l) =>
        l.type === "MILESTONE_HALFWAY" ||
        l.type === "MILESTONE_FINAL_400" ||
        l.type === "MILESTONE_FINAL_200" ||
        l.type === "MILESTONE_FINAL_100" ||
        l.type === "MILESTONE",
    );
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    for (const line of milestoneLines) {
      const allMilestoneTemplates = [
        ...TEMPLATES.MILESTONE_HALFWAY,
        ...TEMPLATES.MILESTONE_FINAL_400,
        ...TEMPLATES.MILESTONE_FINAL_200,
        ...TEMPLATES.MILESTONE_FINAL_100,
        ...TEMPLATES.MILESTONE,
      ];
      const matchesTemplate = allMilestoneTemplates.some((t) => {
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

    const allMilestoneTypes = ["MILESTONE_HALFWAY", "MILESTONE_FINAL_400", "MILESTONE_FINAL_200", "MILESTONE_FINAL_100", "MILESTONE"] as const;

    // First pass through halfway
    const lines1 = gen.update([makeRunner({ position: 800 })], 10.0);
    const milestoneCount1 = lines1.filter((l) => allMilestoneTypes.includes(l.type as never)).length;
    expect(milestoneCount1).toBe(1);

    // Second tick at same position — should not re-announce
    const lines2 = gen.update([makeRunner({ position: 810 })], 10.5);
    const milestoneCount2 = lines2.filter((l) => allMilestoneTypes.includes(l.type as never)).length;
    expect(milestoneCount2).toBe(0);
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

    const allMilestoneTypes = ["MILESTONE_HALFWAY", "MILESTONE_FINAL_400", "MILESTONE_FINAL_200", "MILESTONE_FINAL_100", "MILESTONE"] as const;
    const milestoneLines = lines.filter((l) => allMilestoneTypes.includes(l.type as never));
    expect(milestoneLines.length).toBeGreaterThanOrEqual(1);

    for (const line of milestoneLines) {
      expect(line.text).not.toContain("{remaining}");
    }
  });
});
