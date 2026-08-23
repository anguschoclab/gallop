import { describe, it, expect } from "vitest";
import { generateRaceVerdict } from "@/core/race/raceVerdict";
import type { RunnerFactorLedger, FactorKey } from "@/core/race/factorLedger";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { TrackCondition, Weather } from "@/core/race/types";

function makeFactorEntry(
  raceAvg: number,
  overrides: Partial<{
    peakProgress: number;
    peakValue: number;
    peakDeviation: number;
    earlyAvg: number;
    midAvg: number;
    lateAvg: number;
  }> = {},
): RunnerFactorLedger[FactorKey] {
  const earlyAvg = overrides.earlyAvg ?? raceAvg;
  const midAvg = overrides.midAvg ?? raceAvg;
  const lateAvg = overrides.lateAvg ?? raceAvg;
  return {
    phases: {
      early: { avg: earlyAvg, min: Math.min(earlyAvg, 1), max: Math.max(earlyAvg, 1) },
      mid: { avg: midAvg, min: Math.min(midAvg, 1), max: Math.max(midAvg, 1) },
      late: { avg: lateAvg, min: Math.min(lateAvg, 1), max: Math.max(lateAvg, 1) },
    },
    peakProgress: overrides.peakProgress ?? 0.5,
    peakValue: overrides.peakValue ?? raceAvg,
    peakDeviation: overrides.peakDeviation ?? Math.abs(raceAvg - 1),
    raceAvg,
  };
}

function makeLedger(
  overrides: Partial<Record<FactorKey, ReturnType<typeof makeFactorEntry>>> = {},
): RunnerFactorLedger {
  const keys: FactorKey[] = [
    "stamina",
    "style",
    "draft",
    "cover",
    "turnSpeed",
    "gradientSpeed",
    "gradientStamina",
    "traitSurface",
    "seek",
    "spurt",
    "wind",
    "noise",
  ];
  const ledger = {} as RunnerFactorLedger;
  for (const key of keys) {
    ledger[key] = overrides[key] ?? makeFactorEntry(1);
  }
  return ledger;
}

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    isPlayer: false,
    position: 1600,
    velocity: 16,
    finishTime: 90.0,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 18,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

function makeFieldRunners(count: number): Runner[] {
  const runners: Runner[] = [];
  for (let i = 0; i < count; i++) {
    runners.push(
      makeRunner({
        horseId: `h${i + 1}`,
        name: `Horse ${i + 1}`,
        finishTime: 90 + i * 0.5,
      }),
    );
  }
  return runners;
}

describe("generateRaceVerdict", () => {
  describe("headline generation", () => {
    it("winner + strong spurt → closing kick headline", () => {
      const runner = makeRunner({ finishTime: 90 });
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        spurt: makeFactorEntry(1.12, { peakProgress: 0.85, peakValue: 1.2 }),
      });
      const verdict = generateRaceVerdict(runner, 1, ordered, ledger);
      expect(verdict.headline).toMatch(/clos/i);
    });

    it("winner + strong stamina → stamina headline", () => {
      const runner = makeRunner({ finishTime: 90 });
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        stamina: makeFactorEntry(0.99, { peakProgress: 0.9, peakValue: 0.96 }),
        spurt: makeFactorEntry(1.0),
      });
      const verdict = generateRaceVerdict(runner, 1, ordered, ledger);
      expect(verdict.headline).toMatch(/stamina|front|classy/i);
    });

    it("loser + bad stamina → faded headline", () => {
      const runner = makeRunner({ finishTime: 92 });
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        stamina: makeFactorEntry(0.82, { peakProgress: 0.85, peakValue: 0.75 }),
      });
      const verdict = generateRaceVerdict(runner, 3, ordered, ledger);
      expect(verdict.headline).toMatch(/fade|stamina|distance/i);
    });

    it("mid-pack + good draft → cover headline", () => {
      const runner = makeRunner({ finishTime: 91 });
      const ordered = makeFieldRunners(6);
      const ledger = makeLedger({
        draft: makeFactorEntry(1.04, { peakProgress: 0.5, peakValue: 1.08 }),
        cover: makeFactorEntry(1.03),
      });
      const verdict = generateRaceVerdict(runner, 4, ordered, ledger);
      expect(verdict.headline).toMatch(/cover|draft|evenly/i);
    });

    it("tail + bad wind → conditions headline", () => {
      const runner = makeRunner({ finishTime: 94, trackCondition: "heavy", weather: "rainy" });
      const ordered = makeFieldRunners(6);
      const ledger = makeLedger({
        wind: makeFactorEntry(0.9, { peakProgress: 0.5, peakValue: 0.85 }),
      });
      const verdict = generateRaceVerdict(runner, 6, ordered, ledger);
      expect(verdict.headline).toMatch(/condition|wind|struggl|never/i);
    });
  });

  describe("factor ranking", () => {
    it("selects top 3-4 most impactful factors by abs(raceAvg - 1.0)", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        stamina: makeFactorEntry(0.8),
        spurt: makeFactorEntry(1.15),
        wind: makeFactorEntry(0.95),
        style: makeFactorEntry(1.01),
        draft: makeFactorEntry(1.0),
      });
      const verdict = generateRaceVerdict(runner, 2, ordered, ledger);
      expect(verdict.factors.length).toBeGreaterThanOrEqual(3);
      expect(verdict.factors.length).toBeLessThanOrEqual(4);
      // Most impactful first
      expect(verdict.factors[0].magnitude).toBeGreaterThanOrEqual(verdict.factors[1].magnitude);
    });

    it("includes factor with largest deviation as first", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        stamina: makeFactorEntry(0.7), // 0.3 deviation
        spurt: makeFactorEntry(1.1), // 0.1 deviation
        wind: makeFactorEntry(0.95), // 0.05 deviation
      });
      const verdict = generateRaceVerdict(runner, 2, ordered, ledger);
      expect(verdict.factors[0].key).toBe("stamina");
    });
  });

  describe("impact direction", () => {
    it("classifies > 1.02 as positive", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        spurt: makeFactorEntry(1.1),
      });
      const verdict = generateRaceVerdict(runner, 1, ordered, ledger);
      const spurtFactor = verdict.factors.find((f) => f.key === "spurt");
      expect(spurtFactor).toBeDefined();
      expect(spurtFactor!.impact).toBe("positive");
    });

    it("classifies < 0.98 as negative", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        stamina: makeFactorEntry(0.85),
      });
      const verdict = generateRaceVerdict(runner, 3, ordered, ledger);
      const staminaFactor = verdict.factors.find((f) => f.key === "stamina");
      expect(staminaFactor).toBeDefined();
      expect(staminaFactor!.impact).toBe("negative");
    });

    it("classifies ≈ 1.0 (within 0.02) as neutral", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        style: makeFactorEntry(1.01),
      });
      const verdict = generateRaceVerdict(runner, 2, ordered, ledger);
      const styleFactor = verdict.factors.find((f) => f.key === "style");
      if (styleFactor) {
        expect(styleFactor.impact).toBe("neutral");
      }
    });
  });

  describe("conditions note", () => {
    it("formats track condition + weather", () => {
      const runner = makeRunner({ trackCondition: "soft", weather: "rainy" });
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger();
      const verdict = generateRaceVerdict(runner, 1, ordered, ledger);
      expect(verdict.conditionsNote).toMatch(/soft/i);
      expect(verdict.conditionsNote).toMatch(/rain/i);
    });

    it("formats track condition only when weather is undefined", () => {
      const runner = makeRunner({ trackCondition: "fast" });
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger();
      const verdict = generateRaceVerdict(runner, 1, ordered, ledger);
      expect(verdict.conditionsNote).toMatch(/fast/i);
    });

    it("returns standard conditions note when both undefined", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger();
      const verdict = generateRaceVerdict(runner, 1, ordered, ledger);
      expect(verdict.conditionsNote).toMatch(/standard|normal|default/i);
    });

    it("includes weather 'sunny' in note", () => {
      const runner = makeRunner({ weather: "sunny", trackCondition: "good" });
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger();
      const verdict = generateRaceVerdict(runner, 1, ordered, ledger);
      expect(verdict.conditionsNote).toMatch(/sunny|sun/i);
    });
  });

  describe("field comparison", () => {
    it("compares runner's factor to field average", () => {
      const runner = makeRunner({ horseId: "h1" });
      const ordered = makeFieldRunners(4);
      const runnerLedger = makeLedger({
        turnSpeed: makeFactorEntry(0.9),
      });
      const fieldLedgers = new Map<string, RunnerFactorLedger>();
      fieldLedgers.set("h1", runnerLedger);
      fieldLedgers.set("h2", makeLedger({ turnSpeed: makeFactorEntry(0.97) }));
      fieldLedgers.set("h3", makeLedger({ turnSpeed: makeFactorEntry(0.97) }));
      fieldLedgers.set("h4", makeLedger({ turnSpeed: makeFactorEntry(0.97) }));
      const verdict = generateRaceVerdict(runner, 2, ordered, runnerLedger, fieldLedgers);
      expect(verdict.fieldComparison).toBeDefined();
      expect(verdict.fieldComparison).toMatch(/cornering|turn/i);
    });

    it("omits fieldComparison when fieldLedgers is undefined", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({ stamina: makeFactorEntry(0.85) });
      const verdict = generateRaceVerdict(runner, 2, ordered, ledger);
      expect(verdict.fieldComparison).toBeUndefined();
    });
  });

  describe("phase highlight", () => {
    it("highlights late phase when peak deviation is in late", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        stamina: makeFactorEntry(0.85, {
          peakProgress: 0.9,
          peakValue: 0.75,
          lateAvg: 0.75,
          earlyAvg: 0.95,
          midAvg: 0.9,
        }),
      });
      const verdict = generateRaceVerdict(runner, 3, ordered, ledger);
      const staminaFactor = verdict.factors.find((f) => f.key === "stamina");
      expect(staminaFactor).toBeDefined();
      expect(staminaFactor!.phaseHighlight).toMatch(/late|final|third/i);
    });

    it("highlights early phase when peak deviation is in early", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        seek: makeFactorEntry(0.92, {
          peakProgress: 0.1,
          peakValue: 0.88,
          earlyAvg: 0.88,
          midAvg: 1.0,
          lateAvg: 1.0,
        }),
      });
      const verdict = generateRaceVerdict(runner, 3, ordered, ledger);
      const seekFactor = verdict.factors.find((f) => f.key === "seek");
      expect(seekFactor).toBeDefined();
      expect(seekFactor!.phaseHighlight).toMatch(/early|opening/i);
    });
  });

  describe("verdict factor notes", () => {
    it("generates a human-readable note for each factor", () => {
      const runner = makeRunner();
      const ordered = makeFieldRunners(4);
      const ledger = makeLedger({
        stamina: makeFactorEntry(0.87),
        spurt: makeFactorEntry(1.1),
      });
      const verdict = generateRaceVerdict(runner, 2, ordered, ledger);
      for (const factor of verdict.factors) {
        expect(factor.note).toBeTruthy();
        expect(factor.note.length).toBeGreaterThan(5);
      }
    });
  });
});
