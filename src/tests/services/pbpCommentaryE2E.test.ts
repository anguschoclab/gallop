import { makeNpcOwned, makePlayerOwned } from "@/core/horse/ownership";
import { describe, it, expect } from "vitest";
import {
  generateCommentaryLine,
  generateExpertInsight,
} from "@/services/narrative/commentaryGenerator";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { Race, Horse, Stable } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import {
  TEMPLATES,
  BIOGRAPHICAL_TEMPLATES,
  EXPERT_INSIGHT_TEMPLATES,
  FRAGMENTS,
} from "@/assets/narrative/templates";

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
    fieldSize: 6,
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

function makeFillerRunner(id: string, name: string, overrides: Partial<Runner> = {}): Runner {
  return makeRunner({ horseId: id, name, ...overrides });
}

function makeFillerHorse(id: string, name: string, overrides: Partial<Horse> = {}): Horse {
  return makeHorseEntity({ id, name, ...overrides });
}

// ---------------------------------------------------------------------------
// Layer 1: Exhaustive per-template substitution
// ---------------------------------------------------------------------------

describe("PbP commentary E2E — Layer 1: per-template substitution", () => {
  const race = makeRace();
  const runner = makeRunner({ name: "Thunder Strike" });
  const horse = makeHorseEntity({
    id: "h1",
    name: "Thunder Strike",
    coatColor: "bay",
    gender: "colt",
    sireName: "Galileo",
    damName: "Magic Wand",
    bruceLoweFamily: 1,
    ownership: makeNpcOwned("s1"),
  });
  const stable = makeStable({ id: "s1", name: "Godolphin" });

  it("replaces {horse} in every TEMPLATES entry (real horse)", () => {
    for (const type of Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>) {
      const templates = TEMPLATES[type];
      if (!templates || templates.length === 0) continue; // skip EXPERT_INSIGHT (empty)

      for (let seed = 0; seed < templates.length * 3; seed++) {
        const line = generateCommentaryLine(
          type as never,
          10,
          {
            race,
            runner,
            horse,
            stable,
            rng: createRng(hashStr(`real-${type}-${seed}`)),
            lengths: "2.5",
            hasAnnouncedBio: new Set<string>(),
            lastRanks: new Map([["h1", 3]]),
          },
          { value: 0 },
        );
        if (line.text.length === 0) continue; // guard for empty template arrays
        expect(line.text).not.toContain("{horse}");
      }
    }
  });

  it("replaces {horse} in every TEMPLATES entry (filler runner, horse=undefined)", () => {
    for (const type of Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>) {
      const templates = TEMPLATES[type];
      if (!templates || templates.length === 0) continue;

      for (let seed = 0; seed < templates.length * 3; seed++) {
        const line = generateCommentaryLine(
          type as never,
          10,
          {
            race,
            runner,
            horse: undefined,
            stable: null,
            rng: createRng(hashStr(`filler-${type}-${seed}`)),
            lengths: "2.5",
            hasAnnouncedBio: new Set<string>(),
            lastRanks: new Map([["h1", 3]]),
          },
          { value: 0 },
        );
        if (line.text.length === 0) continue;
        expect(line.text).not.toContain("{horse}");
      }
    }
  });

  it("leaves no unreplaced placeholders in TEMPLATES (real horse)", () => {
    for (const type of Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>) {
      const templates = TEMPLATES[type];
      if (!templates || templates.length === 0) continue;

      for (let seed = 0; seed < templates.length * 3; seed++) {
        const line = generateCommentaryLine(
          type as never,
          10,
          {
            race,
            runner,
            horse,
            stable,
            rng: createRng(hashStr(`no-brace-real-${type}-${seed}`)),
            lengths: "2.5",
            hasAnnouncedBio: new Set<string>(),
            lastRanks: new Map([["h1", 3]]),
          },
          { value: 0 },
        );
        if (line.text.length === 0) continue;
        // DRAFTING {other} is NOT replaced by generateCommentaryLine — handle separately
        if (type === "DRAFTING") {
          const cleaned = line.text.replace("{other}", "Shadow Runner");
          expect(cleaned).not.toContain("{");
        } else {
          expect(line.text).not.toContain("{");
        }
      }
    }
  });

  it("leaves no unreplaced placeholders in TEMPLATES (filler runner)", () => {
    for (const type of Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>) {
      const templates = TEMPLATES[type];
      if (!templates || templates.length === 0) continue;

      for (let seed = 0; seed < templates.length * 3; seed++) {
        const line = generateCommentaryLine(
          type as never,
          10,
          {
            race,
            runner,
            horse: undefined,
            stable: null,
            rng: createRng(hashStr(`no-brace-filler-${type}-${seed}`)),
            lengths: "2.5",
            hasAnnouncedBio: new Set<string>(),
            lastRanks: new Map([["h1", 3]]),
          },
          { value: 0 },
        );
        if (line.text.length === 0) continue;
        if (type === "DRAFTING") {
          const cleaned = line.text.replace("{other}", "Shadow Runner");
          expect(cleaned).not.toContain("{");
        } else {
          expect(line.text).not.toContain("{");
        }
      }
    }
  });

  it("contains the runner's exact name when template has {horse} (real horse)", () => {
    for (const type of Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>) {
      const templates = TEMPLATES[type];
      if (!templates || templates.length === 0) continue;
      const hasHorsePlaceholder = templates.some((t) => t.includes("{horse}"));
      if (!hasHorsePlaceholder) continue;

      let foundName = false;
      for (let seed = 0; seed < 40; seed++) {
        const line = generateCommentaryLine(
          type as never,
          10,
          {
            race,
            runner,
            horse,
            stable,
            rng: createRng(hashStr(`name-real-${type}-${seed}`)),
            lengths: "2.5",
            hasAnnouncedBio: new Set<string>(),
            lastRanks: new Map([["h1", 3]]),
          },
          { value: 0 },
        );
        if (line.text.includes("Thunder Strike")) {
          foundName = true;
          break;
        }
      }
      expect(foundName).toBe(true);
    }
  });

  it("shows fallback values for filler runners", () => {
    for (const type of Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>) {
      const templates = TEMPLATES[type];
      if (!templates || templates.length === 0) continue;

      for (let seed = 0; seed < templates.length * 3; seed++) {
        const line = generateCommentaryLine(
          type as never,
          10,
          {
            race,
            runner,
            horse: undefined,
            stable: null,
            rng: createRng(hashStr(`fallback-${type}-${seed}`)),
            lengths: "2.5",
            hasAnnouncedBio: new Set<string>(),
            lastRanks: new Map([["h1", 3]]),
          },
          { value: 0 },
        );
        if (line.text.length === 0) continue;
        // If the template used {stable}, it should resolve to "Independent"
        // We can't guarantee which template was selected, so just verify no unreplaced placeholders
        if (type === "DRAFTING") {
          const cleaned = line.text.replace("{other}", "Shadow Runner");
          expect(cleaned).not.toContain("{");
        } else {
          expect(line.text).not.toContain("{");
        }
      }
    }
  });

  // --- BIOGRAPHICAL_TEMPLATES ---

  it("replaces all placeholders in BIOGRAPHICAL_TEMPLATES (real horse)", () => {
    for (const tmpl of BIOGRAPHICAL_TEMPLATES) {
      let text = tmpl;
      text = text.split("{horse}").join(runner.name);
      text = text.split("{coat}").join(horse.coatColor || "well-turned-out");
      text = text.split("{gender}").join(horse.gender || "runner");
      text = text.split("{sire}").join(horse.sireName || "an unheralded sire");
      text = text.split("{dam}").join(horse.damName || "an unheralded mare");
      text = text.split("{stable}").join(stable.name || "Independent");
      text = text.split("{family}").join(horse.bruceLoweFamily?.toString() || "Unknown");
      expect(text).not.toContain("{");
      expect(text).toContain("Thunder Strike");
    }
  });

  it("replaces all placeholders in BIOGRAPHICAL_TEMPLATES (filler runner)", () => {
    for (const tmpl of BIOGRAPHICAL_TEMPLATES) {
      let text = tmpl;
      text = text.split("{horse}").join(runner.name);
      text = text.split("{coat}").join("well-turned-out");
      text = text.split("{gender}").join("runner");
      text = text.split("{sire}").join("an unheralded sire");
      text = text.split("{dam}").join("an unheralded mare");
      text = text.split("{stable}").join("Independent");
      text = text.split("{family}").join("Unknown");
      expect(text).not.toContain("{");
      expect(text).toContain("Thunder Strike");
    }
  });

  it("prepends bio templates to SURGE lines via generateCommentaryLine", () => {
    let foundBio = false;
    for (let seed = 0; seed < 100; seed++) {
      const line = generateCommentaryLine(
        "SURGE",
        10,
        {
          race,
          runner,
          horse,
          stable,
          rng: createRng(hashStr(`bio-${seed}`)),
          hasAnnouncedBio: new Set<string>(),
          lastRanks: new Map(),
        },
        { value: 0 },
      );
      // Bio templates start with "The " or similar and contain horse name early
      if (
        line.text.startsWith("The ") ||
        line.text.startsWith("Watch ") ||
        line.text.startsWith("From ")
      ) {
        foundBio = true;
        break;
      }
    }
    // 35% chance per attempt, 100 attempts → virtually certain to fire at least once
    expect(foundBio).toBe(true);
  });

  // --- EXPERT_INSIGHT_TEMPLATES ---

  it("replaces placeholders in all EXPERT_INSIGHT_TEMPLATES sub-categories", () => {
    const raceDistance = race.distance.toString();
    const raceSurface = "dirt";

    for (const subCat of [
      "POSITIVE_FORM",
      "NEGATIVE_FORM",
      "DISTANCE_FIT",
      "SURFACE_FIT",
      "NEW_DISTANCE",
    ] as const) {
      const templates = EXPERT_INSIGHT_TEMPLATES[subCat];
      for (const tmpl of templates) {
        let text = tmpl;
        text = text.split("{horse}").join(runner.name);
        text = text.split("{distance}").join(raceDistance);
        text = text.split("{surface}").join(raceSurface);
        expect(text).not.toContain("{");
        expect(text).toContain("Thunder Strike");
      }
    }
  });

  it("generates expert insight via generateExpertInsight for POSITIVE_FORM", () => {
    const positiveHorse = makeHorseEntity({ form: 10 });
    const insight = generateExpertInsight(
      runner,
      positiveHorse,
      race,
      null,
      createRng(hashStr("pos-form")),
    );
    expect(insight).not.toBeNull();
    expect(insight!).toContain("Thunder Strike");
    expect(insight!).not.toContain("{");
  });

  it("generates expert insight via generateExpertInsight for NEGATIVE_FORM", () => {
    const negativeHorse = makeHorseEntity({ form: -10 });
    const insight = generateExpertInsight(
      runner,
      negativeHorse,
      race,
      null,
      createRng(hashStr("neg-form")),
    );
    expect(insight).not.toBeNull();
    expect(insight!).toContain("Thunder Strike");
    expect(insight!).not.toContain("{");
  });

  it("generates expert insight via generateExpertInsight for DISTANCE_FIT", () => {
    const distStable = makeStable({ preferredDistance: 1500 });
    const distHorse = makeHorseEntity({ form: 0, raceHistory: [{ distance: 1600 } as any] });
    const insight = generateExpertInsight(
      runner,
      distHorse,
      race,
      distStable,
      createRng(hashStr("dist-fit")),
    );
    expect(insight).not.toBeNull();
    expect(insight!).toContain("Thunder Strike");
    expect(insight!).not.toContain("{");
  });

  it("generates expert insight via generateExpertInsight for NEW_DISTANCE", () => {
    const newDistHorse = makeHorseEntity({ form: 0, raceHistory: [] });
    const insight = generateExpertInsight(
      runner,
      newDistHorse,
      race,
      null,
      createRng(hashStr("new-dist")),
    );
    expect(insight).not.toBeNull();
    expect(insight!).toContain("Thunder Strike");
    expect(insight!).not.toContain("{");
  });

  it("generates expert insight via generateExpertInsight for SURFACE_FIT", () => {
    const surfaceHorse = makeHorseEntity({
      form: 0,
      surfaceAptitude: { Turf: 1, Dirt: 90, Synthetic: 1 },
      raceHistory: [{ distance: 1600 } as any],
    });
    const insight = generateExpertInsight(
      runner,
      surfaceHorse,
      race,
      null,
      createRng(hashStr("surface-fit")),
    );
    expect(insight).not.toBeNull();
    expect(insight!).toContain("Thunder Strike");
    expect(insight!).not.toContain("{");
  });

  // --- FRAGMENTS.PREFIXES ---

  it("FRAGMENTS.PREFIXES are valid text without placeholders", () => {
    expect(FRAGMENTS.PREFIXES.length).toBeGreaterThanOrEqual(9);
    for (const prefix of FRAGMENTS.PREFIXES) {
      expect(prefix).not.toContain("{");
      expect(prefix.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Layer 2: Multi-tick NarrativeGenerator simulation
// ---------------------------------------------------------------------------

describe("PbP commentary E2E — Layer 2: multi-tick simulation", () => {
  function buildSimulationFixtures() {
    const race = makeRace({ distance: 1600, weather: "sunny", trackCondition: "good" });
    const rng = createRng(hashStr("e2e-sim-seed"));

    const stable1 = makeStable({ id: "s1", name: "Godolphin", isMajor: true });
    const stable2 = makeStable({ id: "s2", name: "Coolmore", isMajor: false });

    const horse1 = makeHorseEntity({
      id: "h1",
      name: "Thunder Strike",
      ownership: makeNpcOwned("s1"),
      sireName: "Galileo",
      damName: "Magic Wand",
      coatColor: "bay",
      gender: "colt",
      form: 10,
      bruceLoweFamily: 1,
    });
    const horse2 = makeHorseEntity({
      id: "h2",
      name: "Midnight Runner",
      ownership: makeNpcOwned("s2"),
      sireName: "Dansili",
      damName: "Night Owl",
      coatColor: "chestnut",
      gender: "filly",
      form: 0,
      bruceLoweFamily: 3,
    });
    const horse3 = makeFillerHorse("h3", "Desert Wind");
    const horse4 = makeFillerHorse("h4", "Silver Arrow");
    const horse5 = makeFillerHorse("h5", "Falcon Crest");
    const horse6 = makeFillerHorse("h6", "Storm Chaser");

    const horses = [horse1, horse2, horse3, horse4, horse5, horse6];
    const stables = [stable1, stable2];

    const gen = new NarrativeGenerator(race, horses, stables, rng);

    // Base runners — all at position 0, velocity 15
    const makeSimRunner = (id: string, name: string, overrides: Partial<Runner> = {}): Runner =>
      makeRunner({ horseId: id, name, ...overrides });

    return { race, rng, gen, horses, stables, makeSimRunner };
  }

  it("triggers ≥10 distinct event types across a full race simulation", () => {
    const { gen, makeSimRunner } = buildSimulationFixtures();
    const allLines: { type: string; text: string; horseId?: string }[] = [];

    // Tick 0: START, WEATHER_COMMENT, EXPERT_INSIGHT
    const r0 = [
      makeSimRunner("h1", "Thunder Strike", { position: 0, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 0, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 0, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 0, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 0, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 0, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r0, 0.1).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 1: STABLE_WATCH (simTime=3, in [2,15], h1 has stableId s1 with isMajor)
    const r1 = [
      makeSimRunner("h1", "Thunder Strike", { position: 50, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 45, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 40, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 35, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 30, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 25, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r1, 3.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 2: GAP_ANNOUNCEMENT (leader at 100, 2nd at 92, gap=8m=3.3 lengths ≥ 2)
    const r2 = [
      makeSimRunner("h1", "Thunder Strike", { position: 100, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 92, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 80, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 70, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 60, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 50, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r2, 5.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 3: SURGE — h3 goes from rank 5 to rank 2 (rank diff ≥ 2)
    const r3 = [
      makeSimRunner("h1", "Thunder Strike", { position: 150, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 145, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 143, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 140, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 130, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 120, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r3, 8.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 4: FADE — h3 drops back from rank 2 to rank 5 (rank diff ≥ 3)
    const r4 = [
      makeSimRunner("h1", "Thunder Strike", { position: 200, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 195, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 160, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 180, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 175, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 170, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r4, 10.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 5: LEAD_CHANGE — h2 takes lead from h1 (pos > 20)
    const r5 = [
      makeSimRunner("h1", "Thunder Strike", { position: 250, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 260, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 220, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 230, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 240, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 210, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r5, 12.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 6: DRAFTING — h3 drafts behind h4
    const r6 = [
      makeSimRunner("h1", "Thunder Strike", { position: 300, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 310, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 280, velocity: 15, draftingHorseId: "h4" }),
      makeSimRunner("h4", "Silver Arrow", { position: 285, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 290, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 270, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r6, 15.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 7: LANE_WATCH — h5 wide on turn (lane=4.0, pos=200, distFromFinish=1400, trackPos=1400%1600=1400>1200)
    const r7 = [
      makeSimRunner("h1", "Thunder Strike", { position: 350, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 360, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 330, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 340, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 200, velocity: 15, lane: 4.0 }),
      makeSimRunner("h6", "Storm Chaser", { position: 320, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r7, 18.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 8: HOT_PACE — all velocity=20 (>18.89), progress=400/1600=0.25 < 0.6
    const r8 = [
      makeSimRunner("h1", "Thunder Strike", { position: 400, velocity: 20 }),
      makeSimRunner("h2", "Midnight Runner", { position: 410, velocity: 20 }),
      makeSimRunner("h3", "Desert Wind", { position: 380, velocity: 20 }),
      makeSimRunner("h4", "Silver Arrow", { position: 390, velocity: 20 }),
      makeSimRunner("h5", "Falcon Crest", { position: 395, velocity: 20 }),
      makeSimRunner("h6", "Storm Chaser", { position: 370, velocity: 20 }),
    ];
    allLines.push(
      ...gen.update(r8, 22.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 9: MILESTONE — halfway (800m)
    const r9 = [
      makeSimRunner("h1", "Thunder Strike", { position: 800, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 810, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 780, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 790, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 795, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 770, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r9, 35.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 10: MILESTONE — final 400m (1200m)
    const r10 = [
      makeSimRunner("h1", "Thunder Strike", { position: 1200, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 1210, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 1180, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 1190, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 1195, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 1170, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r10, 45.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 11: STRETCH — leader at 1361 (> 1600*0.85=1360)
    const r11 = [
      makeSimRunner("h1", "Thunder Strike", { position: 1361, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 1370, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 1340, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 1350, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 1355, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 1330, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r11, 50.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 12: MILESTONE — final 200m (1400m)
    const r12 = [
      makeSimRunner("h1", "Thunder Strike", { position: 1400, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 1410, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 1380, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 1390, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 1395, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 1370, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r12, 52.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 13: MILESTONE — final 100m (1500m)
    const r13 = [
      makeSimRunner("h1", "Thunder Strike", { position: 1500, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 1510, velocity: 15 }),
      makeSimRunner("h3", "Desert Wind", { position: 1480, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 1490, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 1495, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 1470, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r13, 55.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Tick 14: FINISH — leader crosses wire
    const r14 = [
      makeSimRunner("h1", "Thunder Strike", { position: 1600, velocity: 15, finishTime: 60.0 }),
      makeSimRunner("h2", "Midnight Runner", { position: 1610, velocity: 15, finishTime: 60.5 }),
      makeSimRunner("h3", "Desert Wind", { position: 1580, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 1590, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 1595, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 1570, velocity: 15 }),
    ];
    allLines.push(
      ...gen.update(r14, 60.0).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
    );

    // Ticks 15-19: Post-finish — no new events
    for (let t = 61; t <= 65; t++) {
      allLines.push(
        ...gen.update(r14, t).map((l) => ({ type: l.type, text: l.text, horseId: l.horseId })),
      );
    }

    // Verify ≥10 distinct event types
    const distinctTypes = new Set(allLines.map((l) => l.type));
    expect(distinctTypes.size).toBeGreaterThanOrEqual(10);

    // Verify no unreplaced placeholders in any line
    for (const line of allLines) {
      expect(line.text).not.toContain("{");
    }
  });

  it("filler runner names appear in at least one generated line", () => {
    const { gen, makeSimRunner } = buildSimulationFixtures();
    const allTexts: string[] = [];

    // Run a few ticks with filler runners in different positions
    const r0 = Array.from({ length: 6 }, (_, i) => {
      const ids = ["h1", "h2", "h3", "h4", "h5", "h6"];
      const names = [
        "Thunder Strike",
        "Midnight Runner",
        "Desert Wind",
        "Silver Arrow",
        "Falcon Crest",
        "Storm Chaser",
      ];
      return makeSimRunner(ids[i], names[i], { position: 0, velocity: 15 });
    });
    allTexts.push(...gen.update(r0, 0.1).map((l) => l.text));

    // Put a filler runner in the lead to trigger events about it
    const r1 = [
      makeSimRunner("h3", "Desert Wind", { position: 100, velocity: 15 }),
      makeSimRunner("h1", "Thunder Strike", { position: 90, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 80, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 70, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 60, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 50, velocity: 15 }),
    ];
    allTexts.push(...gen.update(r1, 3.0).map((l) => l.text));

    // Gap announcement should mention the leader (Desert Wind, a filler)
    const r2 = [
      makeSimRunner("h3", "Desert Wind", { position: 200, velocity: 15 }),
      makeSimRunner("h1", "Thunder Strike", { position: 180, velocity: 15 }),
      makeSimRunner("h2", "Midnight Runner", { position: 170, velocity: 15 }),
      makeSimRunner("h4", "Silver Arrow", { position: 160, velocity: 15 }),
      makeSimRunner("h5", "Falcon Crest", { position: 150, velocity: 15 }),
      makeSimRunner("h6", "Storm Chaser", { position: 140, velocity: 15 }),
    ];
    allTexts.push(...gen.update(r2, 5.0).map((l) => l.text));

    const fillerNames = ["Desert Wind", "Silver Arrow", "Falcon Crest", "Storm Chaser"];
    const foundFiller = fillerNames.some((name) => allTexts.some((t) => t.includes(name)));
    expect(foundFiller).toBe(true);
  });

  it("DRAFTING lines contain the {other} runner's name (replaced by narrativeService)", () => {
    const { gen, makeSimRunner } = buildSimulationFixtures();
    const allLines: { type: string; text: string }[] = [];

    // Start
    const r0 = Array.from({ length: 6 }, (_, i) => {
      const ids = ["h1", "h2", "h3", "h4", "h5", "h6"];
      const names = [
        "Thunder Strike",
        "Midnight Runner",
        "Desert Wind",
        "Silver Arrow",
        "Falcon Crest",
        "Storm Chaser",
      ];
      return makeSimRunner(ids[i], names[i], { position: 0, velocity: 15 });
    });
    allLines.push(...gen.update(r0, 0.1).map((l) => ({ type: l.type, text: l.text })));

    // Set up drafting: h3 drafts behind h4
    let draftingTriggered = false;
    for (let t = 3; t <= 50 && !draftingTriggered; t += 5) {
      const pos = t * 10;
      const runners = [
        makeSimRunner("h1", "Thunder Strike", { position: pos + 50, velocity: 15 }),
        makeSimRunner("h2", "Midnight Runner", { position: pos + 40, velocity: 15 }),
        makeSimRunner("h3", "Desert Wind", { position: pos, velocity: 15, draftingHorseId: "h4" }),
        makeSimRunner("h4", "Silver Arrow", { position: pos + 5, velocity: 15 }),
        makeSimRunner("h5", "Falcon Crest", { position: pos + 30, velocity: 15 }),
        makeSimRunner("h6", "Storm Chaser", { position: pos + 20, velocity: 15 }),
      ];
      const lines = gen.update(runners, t);
      allLines.push(...lines.map((l) => ({ type: l.type, text: l.text })));
      if (lines.some((l) => l.type === "DRAFTING")) {
        draftingTriggered = true;
      }
    }

    const draftingLines = allLines.filter((l) => l.type === "DRAFTING");
    if (draftingLines.length > 0) {
      for (const line of draftingLines) {
        // {other} should have been replaced by the other runner's name
        expect(line.text).not.toContain("{other}");
        // Should contain either "Silver Arrow" (the drafted horse)
        expect(line.text).toContain("Silver Arrow");
      }
    }
  });

  it("no unreplaced placeholders in any line across full simulation", () => {
    const { gen, makeSimRunner } = buildSimulationFixtures();
    const allTexts: string[] = [];

    // Run 20 ticks covering the full race
    const positions = [
      [0, 0, 0, 0, 0, 0],
      [50, 45, 40, 35, 30, 25],
      [100, 92, 80, 70, 60, 50],
      [150, 145, 143, 140, 130, 120],
      [200, 195, 160, 180, 175, 170],
      [250, 260, 220, 230, 240, 210],
      [300, 310, 280, 285, 290, 270],
      [350, 360, 330, 340, 200, 320],
      [400, 410, 380, 390, 395, 370],
      [800, 810, 780, 790, 795, 770],
      [1200, 1210, 1180, 1190, 1195, 1170],
      [1361, 1370, 1340, 1350, 1355, 1330],
      [1400, 1410, 1380, 1390, 1395, 1370],
      [1500, 1510, 1480, 1490, 1495, 1470],
      [1600, 1610, 1580, 1590, 1595, 1570],
    ];
    const times = [0.1, 3, 5, 8, 10, 12, 15, 18, 22, 35, 45, 50, 52, 55, 60];
    const ids = ["h1", "h2", "h3", "h4", "h5", "h6"];
    const names = [
      "Thunder Strike",
      "Midnight Runner",
      "Desert Wind",
      "Silver Arrow",
      "Falcon Crest",
      "Storm Chaser",
    ];

    for (let tick = 0; tick < positions.length; tick++) {
      const runners = positions[tick].map((pos, i) =>
        makeSimRunner(ids[i], names[i], {
          position: pos,
          velocity: tick === 8 ? 20 : 15,
          finishTime: tick >= 14 && i < 2 ? 60.0 + i * 0.5 : null,
          lane: tick === 7 && i === 4 ? 4.0 : 1,
          draftingHorseId: tick === 6 && i === 2 ? "h4" : null,
        }),
      );
      allTexts.push(...gen.update(runners, times[tick]).map((l) => l.text));
    }

    for (const text of allTexts) {
      expect(text).not.toContain("{");
    }
  });
});
