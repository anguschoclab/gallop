import { describe, it, expect } from "vitest";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import { CommentaryMemory } from "@/services/narrative/commentaryMemory";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { CommentaryLine } from "@/services/narrative/types";
import { createRng, hashStr } from "@/core/common/rng";
import {
  COMEBACK_NOTE_TEMPLATES,
  REDEMPTION_NOTE_TEMPLATES,
  CONFIRMATION_NOTE_TEMPLATES,
} from "@/assets/narrative/chainingTemplates";

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

function makeLine(overrides: Partial<CommentaryLine> = {}): CommentaryLine {
  return {
    id: "test-1",
    text: "test",
    timestamp: 10,
    type: "FADE",
    horseId: "h1",
    receivedAt: Date.now(),
    ...overrides,
  };
}

const CHAINING_TYPES = ["COMEBACK_NOTE", "REDEMPTION_NOTE", "CONFIRMATION_NOTE"];

describe("NarrativeGenerator — Contextual Chaining (Commentary Memory)", () => {
  it("CommentaryMemory.recordEvent() tracks horse arcs (struggling)", () => {
    const mem = new CommentaryMemory();
    mem.recordEvent(makeLine({ type: "FADE", horseId: "h1", timestamp: 10 }));
    const arc = mem.getArc("h1");
    expect(arc.mentionedAsStruggling).toBe(true);
    expect(arc.lastStruggleSimTime).toBe(10);
  });

  it("CommentaryMemory.canCallback() returns true when horse was struggling and is now surging", () => {
    const mem = new CommentaryMemory();
    mem.recordEvent(makeLine({ type: "FADE", horseId: "h1", timestamp: 10 }));
    expect(mem.canCallback("h1", "SURGE")).toBe(true);
  });

  it("CommentaryMemory.canCallback() returns false when no prior struggling event", () => {
    const mem = new CommentaryMemory();
    expect(mem.canCallback("h1", "SURGE")).toBe(false);
  });

  it("CommentaryMemory.canCallback() returns true for FLYING after struggling", () => {
    const mem = new CommentaryMemory();
    mem.recordEvent(makeLine({ type: "IN_TROUBLE", horseId: "h1", timestamp: 10 }));
    expect(mem.canCallback("h1", "FLYING")).toBe(true);
  });

  it("no chaining lines fire when no prior struggle events exist", () => {
    const rng = createRng(hashStr("chaining-no-prior"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    // Start race
    gen.update([makeRunner()], 0.1);

    // Run several ticks — no prior struggle, so no chaining callbacks
    const allLines: CommentaryLine[] = [];
    for (let t = 1; t <= 20; t++) {
      const lines = gen.update([makeRunner({ position: t * 50, velocity: 15 })], t);
      allLines.push(...lines);
    }
    const chainingLines = allLines.filter((l) => CHAINING_TYPES.includes(l.type));
    expect(chainingLines.length).toBe(0);
  });

  it("no chaining lines fire after race finish", () => {
    const rng = createRng(hashStr("chaining-finish"));
    const race = makeRace();
    const horse = makeHorseEntity();
    const stable = makeStable();
    const gen = new NarrativeGenerator(race, [horse], [stable], rng);

    gen.update([makeRunner()], 0.1);
    gen.update([makeRunner({ position: 1600, finishTime: 60 })], 60);

    const lines = gen.update([makeRunner({ position: 1600 })], 61);
    const chainingLines = lines.filter((l) => CHAINING_TYPES.includes(l.type));
    expect(chainingLines.length).toBe(0);
  });

  it("each chaining template array has ≥12 entries", () => {
    expect(COMEBACK_NOTE_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(REDEMPTION_NOTE_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(CONFIRMATION_NOTE_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it("CommentaryMemory tracks surging arcs", () => {
    const mem = new CommentaryMemory();
    mem.recordEvent(makeLine({ type: "SURGE", horseId: "h1", timestamp: 15 }));
    const arc = mem.getArc("h1");
    expect(arc.mentionedAsSurging).toBe(true);
    expect(arc.lastSurgeSimTime).toBe(15);
  });

  it("CommentaryMemory.canCallback() returns true for LEAD_CHANGE after surging", () => {
    const mem = new CommentaryMemory();
    mem.recordEvent(makeLine({ type: "SURGE", horseId: "h1", timestamp: 10 }));
    expect(mem.canCallback("h1", "LEAD_CHANGE")).toBe(true);
  });
});
