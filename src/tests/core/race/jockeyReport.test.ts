import { describe, it, expect } from "vitest";
import {
  generateJockeyReport,
  gradeColorClass,
  type JockeyReportGrade,
} from "@/core/race/jockeyReport";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { SectionalSplit, SectionalEntry } from "@/core/race/types";
import type { Jockey, JockeyStats } from "@/core/jockey/types";
import type { Horse } from "@/game/types";

function makeEntry(horseId: string, rank: number): SectionalEntry {
  return {
    horseId,
    splitTime: 12.5,
    cumulativeTime: 12.5,
    rank,
    velocityMs: 15,
  };
}

function makeSplit(label: string, entries: SectionalEntry[]): SectionalSplit {
  return {
    label,
    distanceMeters: 400,
    entries,
  };
}

function makeJockeyStats(overrides?: Partial<JockeyStats>): JockeyStats {
  return {
    pacing: 60,
    positioning: 60,
    vigor: 60,
    gateSkill: 60,
    temperament: 60,
    ...overrides,
  };
}

function makeJockey(overrides?: Partial<Jockey>): Jockey {
  return {
    id: "jockey-1",
    name: "Test Jockey",
    age: 28,
    archetype: "versatile",
    stats: makeJockeyStats(),
    potential: 80,
    traits: [],
    silk: { pattern: "solid", primary: "#ff0000", secondary: "#00ff00", cap: "#0000ff" },
    careerStarts: 100,
    careerWins: 20,
    fame: 50,
    ridingFee: 500,
    affinityMap: {},
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
    ...overrides,
  };
}

function makeHorse(overrides?: Partial<Horse>): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "#FF0000",
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    energy: 100,
    form: 0,
    potential: 75,
    raceHistory: [],
    owned: true,
    fame: 50,
    runningStyle: "P",
    healthStatus: "healthy",
    coatColor: "bay",
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    injuryProneness: 0.1,
    height: 15.2,
    weight: 500,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    heartScore: 1.0,
    fiberBias: "average",
    strideType: "average",
    trackPreference: "balanced",
    mudAptitude: 1.0,
    trainability: 1.0,
    peakAge: 4,
    recoveryRate: 1.0,
    fertility: 0.85,
    foalingEase: 0.9,
    markings: { socks: "none", face: "none", silverDapple: false, sabino: false, splashWhite: false },
    bleederRisk: 0.05,
    roarerRisk: 0.03,
    ocdRisk: 0.03,
    bloodline: "Test Line",
    heterozygosity: 0.8,
    coefficientOfInbreeding: 0.0,
    ancestralHistoryCoefficient: 0.5,
    racingViable: true,
    lifecycleStatus: "active",
    healthStatusDay: 1,
    gelded: false,
    isBlueHen: false,
    fitness: 50,
    fatigue: 0,
    peakingIndex: 50,
    recoveryPoints: 100,
    birthDay: 1,
    courseVisits: {},
    pedigree: { name: "Test Horse", generation: 0, sireName: "Sire", damName: "Dam" },
    ...overrides,
  } as Horse;
}

function makeRunner(overrides?: Partial<Runner>): Runner {
  return {
    horseId: "h1",
    name: "Test Runner",
    silk: "#FF0000",
    owned: true,
    position: 1,
    velocity: 15,
    finishTime: 60.0,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    barrier: 1,
    topSpeed: 16,
    accel: 5,
    staminaFactor: 1.0,
    noise: 0.02,
    affinityBonus: 0.05,
    runningStyle: "P",
    draftingHorseId: null,
    horse: makeHorse(),
    jockey: makeJockey(),
    jockeyName: "Test Jockey",
    weight: 57,
    courseFamiliarityMultiplier: 1.0,
    ...overrides,
  };
}

describe("ranksByHorse (via generateJockeyReport)", () => {
  it("returns correct ranks for horse present in all splits", () => {
    const splits: SectionalSplit[] = [
      makeSplit("¼", [makeEntry("h1", 1), makeEntry("h2", 2)]),
      makeSplit("½", [makeEntry("h1", 2), makeEntry("h2", 1)]),
      makeSplit("¾", [makeEntry("h1", 3), makeEntry("h2", 4)]),
      makeSplit("Fin", [makeEntry("h1", 4), makeEntry("h2", 3)]),
    ];
    const runner = makeRunner({ horseId: "h1" });
    const ordered = [runner, makeRunner({ horseId: "h2", name: "Other" })];

    const report = generateJockeyReport(runner, ordered, splits);

    expect(report.finishPosition).toBe(1);
    expect(report.fieldSize).toBe(2);
    expect(report.facets).toHaveLength(10);
  });

  it("returns empty ranks for horse not in any split", () => {
    const splits: SectionalSplit[] = [
      makeSplit("¼", [makeEntry("h2", 1), makeEntry("h3", 2)]),
      makeSplit("½", [makeEntry("h2", 1), makeEntry("h3", 2)]),
    ];
    const runner = makeRunner({ horseId: "hX" });
    const ordered = [
      makeRunner({ horseId: "h2", name: "Other 1" }),
      makeRunner({ horseId: "h3", name: "Other 2" }),
      runner,
    ];

    const report = generateJockeyReport(runner, ordered, splits);

    expect(report.finishPosition).toBe(3);
    expect(report.facets).toHaveLength(10);
    const gateFacet = report.facets.find((f) => f.id === "gate_break");
    expect(gateFacet?.note).toContain("No sectional data");
  });

  it("returns partial ranks for horse in some splits only", () => {
    const splits: SectionalSplit[] = [
      makeSplit("¼", [makeEntry("h1", 3), makeEntry("h2", 1)]),
      makeSplit("½", [makeEntry("h2", 1), makeEntry("h3", 2)]),
      makeSplit("¾", [makeEntry("h1", 1), makeEntry("h2", 2)]),
      makeSplit("Fin", [makeEntry("h2", 1), makeEntry("h3", 2)]),
    ];
    const runner = makeRunner({ horseId: "h1" });
    const ordered = [
      makeRunner({ horseId: "h2", name: "Other 1" }),
      makeRunner({ horseId: "h3", name: "Other 2" }),
      runner,
    ];

    const report = generateJockeyReport(runner, ordered, splits);

    expect(report.finishPosition).toBe(3);
    expect(report.facets).toHaveLength(10);
  });

  it("handles empty splits array", () => {
    const runner = makeRunner({ horseId: "h1" });
    const ordered = [runner];

    const report = generateJockeyReport(runner, ordered, []);

    expect(report.facets).toHaveLength(10);
    const gateFacet = report.facets.find((f) => f.id === "gate_break");
    expect(gateFacet?.note).toContain("No sectional data");
  });

  it("handles splits with empty entries", () => {
    const splits: SectionalSplit[] = [
      makeSplit("¼", []),
      makeSplit("½", []),
    ];
    const runner = makeRunner({ horseId: "h1" });
    const ordered = [runner];

    const report = generateJockeyReport(runner, ordered, splits);

    expect(report.facets).toHaveLength(10);
    const gateFacet = report.facets.find((f) => f.id === "gate_break");
    expect(gateFacet?.note).toContain("No sectional data");
  });
});

describe("generateJockeyReport", () => {
  it("produces valid report with sectional data", () => {
    const runner = makeRunner({ horseId: "h1" });
    const ordered = [
      runner,
      makeRunner({ horseId: "h2", name: "Runner 2" }),
      makeRunner({ horseId: "h3", name: "Runner 3" }),
    ];
    const splits: SectionalSplit[] = [
      makeSplit("¼", [makeEntry("h1", 1), makeEntry("h2", 2), makeEntry("h3", 3)]),
      makeSplit("½", [makeEntry("h1", 2), makeEntry("h2", 1), makeEntry("h3", 3)]),
      makeSplit("¾", [makeEntry("h1", 1), makeEntry("h2", 2), makeEntry("h3", 3)]),
      makeSplit("Fin", [makeEntry("h1", 1), makeEntry("h2", 2), makeEntry("h3", 3)]),
    ];

    const report = generateJockeyReport(runner, ordered, splits);

    expect(report.horseId).toBe("h1");
    expect(report.horseName).toBe("Test Runner");
    expect(report.jockeyName).toBe("Test Jockey");
    expect(report.finishPosition).toBe(1);
    expect(report.fieldSize).toBe(3);
    expect(report.facets).toHaveLength(10);

    for (const facet of report.facets) {
      expect(facet.score).toBeGreaterThanOrEqual(0);
      expect(facet.score).toBeLessThanOrEqual(100);
      expect(facet.grade).toBeDefined();
      expect(facet.note).toBeTruthy();
      expect(facet.label).toBeTruthy();
      expect(facet.description).toBeTruthy();
    }
  });

  it("produces valid report without sectional data", () => {
    const runner = makeRunner({ horseId: "h1" });
    const ordered = [runner, makeRunner({ horseId: "h2", name: "Runner 2" })];

    const report = generateJockeyReport(runner, ordered, undefined);

    expect(report.facets).toHaveLength(10);
    const gateFacet = report.facets.find((f) => f.id === "gate_break");
    expect(gateFacet?.note).toContain("No sectional data");
  });

  it("computes correct finish position from ordered array", () => {
    const runner1 = makeRunner({ horseId: "h1", name: "First" });
    const runner2 = makeRunner({ horseId: "h2", name: "Second" });
    const runner3 = makeRunner({ horseId: "h3", name: "Third" });
    const ordered = [runner1, runner2, runner3];

    const report1 = generateJockeyReport(runner1, ordered, undefined);
    const report2 = generateJockeyReport(runner2, ordered, undefined);
    const report3 = generateJockeyReport(runner3, ordered, undefined);

    expect(report1.finishPosition).toBe(1);
    expect(report2.finishPosition).toBe(2);
    expect(report3.finishPosition).toBe(3);
  });

  it("clamps averageScore within 0-100", () => {
    const runner = makeRunner({ horseId: "h1" });
    const ordered = [runner];

    const report = generateJockeyReport(runner, ordered, undefined);

    expect(report.averageScore).toBeGreaterThanOrEqual(0);
    expect(report.averageScore).toBeLessThanOrEqual(100);
  });

  it("returns finishPosition = 1 when runner not found in ordered (edge case)", () => {
    const runner = makeRunner({ horseId: "hX" });
    const ordered = [
      makeRunner({ horseId: "h1", name: "First" }),
      makeRunner({ horseId: "h2", name: "Second" }),
    ];

    const report = generateJockeyReport(runner, ordered, undefined);

    expect(report.finishPosition).toBe(1);
  });

  it("correctly computes finishPosition for multiple runners in a .map() (regression for O(N²) fix)", () => {
    const runners = [
      makeRunner({ horseId: "h1", name: "First" }),
      makeRunner({ horseId: "h2", name: "Second" }),
      makeRunner({ horseId: "h3", name: "Third" }),
      makeRunner({ horseId: "h4", name: "Fourth" }),
    ];

    const reports = runners.map((r) => generateJockeyReport(r, runners, undefined));

    expect(reports[0].finishPosition).toBe(1);
    expect(reports[1].finishPosition).toBe(2);
    expect(reports[2].finishPosition).toBe(3);
    expect(reports[3].finishPosition).toBe(4);
  });

  it("accepts optional finishPositionMap for O(1) finish position lookup", () => {
    const runners = [
      makeRunner({ horseId: "h1", name: "First" }),
      makeRunner({ horseId: "h2", name: "Second" }),
      makeRunner({ horseId: "h3", name: "Third" }),
    ];
    const finishPositionMap = new Map<string, number>();
    for (let i = 0; i < runners.length; i++) {
      finishPositionMap.set(runners[i].horseId, i + 1);
    }

    const report = generateJockeyReport(runners[2], runners, undefined, finishPositionMap);

    expect(report.finishPosition).toBe(3);
  });
});

describe("gradeColorClass", () => {
  const grades: JockeyReportGrade[] = ["A+", "A", "B", "C", "D", "F"];

  for (const grade of grades) {
    it(`returns non-empty class string for grade ${grade}`, () => {
      const result = gradeColorClass(grade);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  }

  it("returns distinct classes for different grades", () => {
    const classes = grades.map((g) => gradeColorClass(g));
    const unique = new Set(classes);
    expect(unique.size).toBe(grades.length);
  });
});
