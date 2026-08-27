import { makePlayerOwned } from "@/core/horse/ownership";
import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable, Jockey } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import {
  JOCKEY_MOVE_TEMPLATES,
  JOCKEY_TACTIC_TEMPLATES,
  JOCKEY_MASTERY_TEMPLATES,
  JOCKEY_APPRENTICE_TEMPLATES,
  JOCKEY_TRAIT_TEMPLATES,
} from "@/assets/narrative/jockeyTemplates";

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

function makeJockey(overrides: Partial<Jockey> = {}): Jockey {
  return {
    id: "j1" as never,
    name: "Test Jockey",
    age: 25,
    archetype: "versatile",
    tier: "mid",
    stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
    potential: 70,
    traits: [],
    silk: { pattern: "solid", primary: "red", secondary: "blue", cap: "white" },
    careerStarts: 100,
    careerWins: 10,
    fame: 0,
    ridingFee: 100,
    affinityMap: {},
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
    ...overrides,
  } as Jockey;
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
    jockey: makeJockey(),
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

describe("NarrativeGenerator — Jockey Commentary", () => {
  it("JOCKEY_MASTERY fires for elite-tier jockeys", () => {
    const rng = createRng(hashStr("jockey-mastery-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const eliteJockey = makeJockey({ name: "Frankie Dettori", tier: "elite", potential: 95 });
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({
      jockey: eliteJockey,
      jockeyName: "Frankie Dettori",
      position: 100,
    });
    const lines = gen.update([runner], 5.0);

    const masteryLines = lines.filter((l) => l.type === "JOCKEY_MASTERY");
    expect(masteryLines.length).toBeGreaterThanOrEqual(1);
    expect(masteryLines[0].text).toContain("Frankie Dettori");
  });

  it("JOCKEY_APPRENTICE fires when jockey.isApprentice is true", () => {
    const rng = createRng(hashStr("jockey-apprentice-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const apprenticeJockey = makeJockey({ name: "Young Rider", isApprentice: true, tier: "budget" });
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    const runner = makeRunner({
      jockey: apprenticeJockey,
      jockeyName: "Young Rider",
      position: 100,
    });
    const lines = gen.update([runner], 5.0);

    const apprenticeLines = lines.filter((l) => l.type === "JOCKEY_APPRENTICE");
    expect(apprenticeLines.length).toBeGreaterThanOrEqual(1);
    expect(apprenticeLines[0].text).toContain("Young Rider");
  });

  it("JOCKEY_TRAIT fires for gate_master at race start", () => {
    const rng = createRng(hashStr("jockey-gate-master"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gateMasterJockey = makeJockey({
      name: "Gate Master",
      traits: ["gate_master"],
      tier: "mid",
    });
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // First tick triggers START + JOCKEY_TACTIC (default runner, mid-tier no traits)
    const startRunner = makeRunner({ jockey: makeJockey({ tier: "budget", traits: [] }), jockeyName: "Other Jockey" });
    gen.update([startRunner], 0.1);

    // Second tick with gate_master jockey — different horseId to avoid cooldown conflict
    const runner = makeRunner({
      horseId: "h2",
      jockey: gateMasterJockey,
      jockeyName: "Gate Master",
      position: 50,
    });
    const lines = gen.update([runner], 3.0);

    const traitLines = lines.filter((l) => l.type === "JOCKEY_TRAIT");
    expect(traitLines.length).toBeGreaterThanOrEqual(1);
    expect(traitLines[0].text).toContain("Gate Master");
  });

  it("JOCKEY_TRAIT fires for mud_master on soft track condition", () => {
    const rng = createRng(hashStr("jockey-mud-master"));
    const race = makeRace({ trackCondition: "soft" });
    const horse = makeHorseEntity();
    const stable = makeStable();
    const mudMasterJockey = makeJockey({
      name: "Mud Rider",
      traits: ["mud_master"],
      tier: "mid",
    });
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // First tick with a different horse to avoid cooldown conflict
    const startRunner = makeRunner({ jockey: makeJockey({ tier: "budget", traits: [] }), jockeyName: "Other Jockey" });
    gen.update([startRunner], 0.1);

    // Second tick with mud_master jockey on a different horse
    const runner = makeRunner({
      horseId: "h2",
      jockey: mudMasterJockey,
      jockeyName: "Mud Rider",
      position: 200,
    });
    const lines = gen.update([runner], 8.0);

    const traitLines = lines.filter((l) => l.type === "JOCKEY_TRAIT");
    expect(traitLines.length).toBeGreaterThanOrEqual(1);
    expect(traitLines[0].text).toContain("Mud Rider");
  });

  it("JOCKEY_TACTIC fires as fallback for mid-tier jockey with no traits", () => {
    const rng = createRng(hashStr("jockey-tactic-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // The first tick fires START + JOCKEY_TACTIC (mid-tier, no traits)
    const lines = gen.update([makeRunner()], 0.1);

    const tacticLines = lines.filter((l) => l.type === "JOCKEY_TACTIC");
    expect(tacticLines.length).toBeGreaterThanOrEqual(1);
    expect(tacticLines[0].text).toContain("Test Jockey");
  });

  it("{jockey} placeholder is replaced with jockey name in all jockey templates", () => {
    const rng = createRng(hashStr("jockey-placeholder-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // Run multiple ticks to trigger various jockey events
    const runner = makeRunner({ position: 300 });
    const lines = gen.update([runner], 12.0);

    const jockeyTypes = ["JOCKEY_MOVE", "JOCKEY_TACTIC", "JOCKEY_MASTERY", "JOCKEY_APPRENTICE", "JOCKEY_TRAIT"];
    const jockeyLines = lines.filter((l) => jockeyTypes.includes(l.type));
    for (const line of jockeyLines) {
      expect(line.text).not.toContain("{jockey}");
      expect(line.text).not.toContain("{jockeyArchetype}");
    }
  });

  it("jockey commentary respects cooldown per horse", () => {
    const rng = createRng(hashStr("jockey-cooldown-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // First tick fires START + JOCKEY_TACTIC
    const lines1 = gen.update([makeRunner()], 0.1);
    const jockeyTypes = ["JOCKEY_MOVE", "JOCKEY_TACTIC", "JOCKEY_MASTERY", "JOCKEY_APPRENTICE", "JOCKEY_TRAIT"];
    const jockeyLines1 = lines1.filter((l) => jockeyTypes.includes(l.type));
    expect(jockeyLines1.length).toBeGreaterThanOrEqual(1);

    // Second tick at simTime=10 — within 35s cooldown, should NOT fire
    const lines2 = gen.update([makeRunner({ position: 250 })], 10.0);
    const jockeyLines2 = lines2.filter((l) => jockeyTypes.includes(l.type));
    expect(jockeyLines2.length).toBe(0);
  });

  it("jockey commentary does not fire after race finish", () => {
    const rng = createRng(hashStr("jockey-finish-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // Finish the race
    const finishedRunner = makeRunner({ position: 1600, finishTime: 60.0 });
    gen.update([finishedRunner], 60.0);

    // Post-finish tick — should not produce jockey commentary
    const lines = gen.update([finishedRunner], 61.0);
    const jockeyTypes = ["JOCKEY_MOVE", "JOCKEY_TACTIC", "JOCKEY_MASTERY", "JOCKEY_APPRENTICE", "JOCKEY_TRAIT"];
    const jockeyLines = lines.filter((l) => jockeyTypes.includes(l.type));
    expect(jockeyLines.length).toBe(0);
  });

  it("jockey commentary does not fire when runner.jockey is undefined", () => {
    const rng = createRng(hashStr("jockey-undefined-test"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);

    // Runner with no jockey data
    const runner = makeRunner({ jockey: undefined, jockeyName: undefined, position: 200 }) as Runner;
    const lines = gen.update([runner], 8.0);
    const jockeyTypes = ["JOCKEY_MOVE", "JOCKEY_TACTIC", "JOCKEY_MASTERY", "JOCKEY_APPRENTICE", "JOCKEY_TRAIT"];
    const jockeyLines = lines.filter((l) => jockeyTypes.includes(l.type));
    expect(jockeyLines.length).toBe(0);
  });

  it("each jockey template array has ≥12 entries", () => {
    expect(JOCKEY_MOVE_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(JOCKEY_TACTIC_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(JOCKEY_MASTERY_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(JOCKEY_APPRENTICE_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it("JOCKEY_TRAIT_TEMPLATES has entries for all 13 traits", () => {
    const expectedTraits = [
      "bullring_expert",
      "hill_specialist",
      "long_straight_pro",
      "gate_master",
      "turf_specialist",
      "dirt_specialist",
      "mud_master",
      "sprint_specialist",
      "staying_specialist",
      "pace_presser",
      "big_match_temperament",
      "veteran_poise",
      "closer_instinct",
    ];
    for (const trait of expectedTraits) {
      expect(JOCKEY_TRAIT_TEMPLATES[trait as keyof typeof JOCKEY_TRAIT_TEMPLATES]).toBeDefined();
      expect(JOCKEY_TRAIT_TEMPLATES[trait as keyof typeof JOCKEY_TRAIT_TEMPLATES].length).toBeGreaterThanOrEqual(3);
    }
  });
});
