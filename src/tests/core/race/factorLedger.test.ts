import { describe, it, expect } from "vitest";
import {
  FactorLedgerCollector,
  FACTOR_META,
  type FactorKey,
  type RunnerFactorLedger,
} from "@/core/race/factorLedger";

const ALL_FACTORS: FactorKey[] = [
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

function makeTickValues(
  overrides: Partial<Record<FactorKey, number>> = {},
): Record<FactorKey, number> {
  const base = {
    stamina: 1,
    style: 1,
    draft: 1,
    cover: 1,
    turnSpeed: 1,
    gradientSpeed: 1,
    gradientStamina: 1,
    traitSurface: 1,
    seek: 1,
    spurt: 1,
    wind: 1,
    noise: 1,
  } as Record<FactorKey, number>;
  return { ...base, ...overrides } as Record<FactorKey, number>;
}

describe("FACTOR_META", () => {
  it("has an entry for every FactorKey", () => {
    for (const key of ALL_FACTORS) {
      expect(FACTOR_META[key]).toBeDefined();
      expect(FACTOR_META[key].label).toBeTruthy();
      expect(FACTOR_META[key].description).toBeTruthy();
    }
  });

  it("has exactly 12 entries", () => {
    expect(Object.keys(FACTOR_META)).toHaveLength(12);
  });
});

describe("FactorLedgerCollector", () => {
  describe("recordTick + finalize basic flow", () => {
    it("produces a ledger with all 12 factors after a single tick", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ stamina: 0.9 }));
      const ledger = collector.finalize();
      for (const key of ALL_FACTORS) {
        expect(ledger[key]).toBeDefined();
        expect(ledger[key].phases).toBeDefined();
        expect(ledger[key].phases.early).toBeDefined();
        expect(ledger[key].phases.mid).toBeDefined();
        expect(ledger[key].phases.late).toBeDefined();
      }
    });

    it("records correct avg/min/max for a single tick in early phase", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ stamina: 0.85 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.early.avg).toBeCloseTo(0.85);
      expect(ledger.stamina.phases.early.min).toBeCloseTo(0.85);
      expect(ledger.stamina.phases.early.max).toBeCloseTo(0.85);
    });

    it("records correct avg/min/max across multiple ticks in same phase", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.05, makeTickValues({ stamina: 0.9 }));
      collector.recordTick(0.1, makeTickValues({ stamina: 0.8 }));
      collector.recordTick(0.15, makeTickValues({ stamina: 0.7 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.early.avg).toBeCloseTo((0.9 + 0.8 + 0.7) / 3);
      expect(ledger.stamina.phases.early.min).toBeCloseTo(0.7);
      expect(ledger.stamina.phases.early.max).toBeCloseTo(0.9);
    });
  });

  describe("phase classification", () => {
    it("classifies progress < 0.33 as early", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ stamina: 0.9 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.early.avg).toBeCloseTo(0.9);
      expect(ledger.stamina.phases.mid.avg).toBe(1);
      expect(ledger.stamina.phases.late.avg).toBe(1);
    });

    it("classifies progress 0.33-0.67 as mid", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.5, makeTickValues({ stamina: 0.8 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.early.avg).toBe(1);
      expect(ledger.stamina.phases.mid.avg).toBeCloseTo(0.8);
      expect(ledger.stamina.phases.late.avg).toBe(1);
    });

    it("classifies progress > 0.67 as late", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.8, makeTickValues({ stamina: 0.7 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.early.avg).toBe(1);
      expect(ledger.stamina.phases.mid.avg).toBe(1);
      expect(ledger.stamina.phases.late.avg).toBeCloseTo(0.7);
    });

    it("classifies progress exactly 0.33 as early", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.33, makeTickValues({ stamina: 0.85 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.early.avg).toBeCloseTo(0.85);
    });

    it("classifies progress exactly 0.67 as mid", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.67, makeTickValues({ stamina: 0.75 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.mid.avg).toBeCloseTo(0.75);
    });
  });

  describe("peak detection", () => {
    it("identifies the tick where factor deviated most from 1.0", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ stamina: 0.95 }));
      collector.recordTick(0.5, makeTickValues({ stamina: 0.8 }));
      collector.recordTick(0.9, makeTickValues({ stamina: 0.9 }));
      const ledger = collector.finalize();
      // 0.8 has the largest deviation (0.2) from 1.0
      expect(ledger.stamina.peakProgress).toBeCloseTo(0.5);
      expect(ledger.stamina.peakValue).toBeCloseTo(0.8);
      expect(ledger.stamina.peakDeviation).toBeCloseTo(0.2);
    });

    it("detects peak for values above 1.0 (positive deviation)", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ spurt: 1.05 }));
      collector.recordTick(0.5, makeTickValues({ spurt: 1.15 }));
      collector.recordTick(0.9, makeTickValues({ spurt: 1.1 }));
      const ledger = collector.finalize();
      expect(ledger.spurt.peakProgress).toBeCloseTo(0.5);
      expect(ledger.spurt.peakValue).toBeCloseTo(1.15);
      expect(ledger.spurt.peakDeviation).toBeCloseTo(0.15);
    });

    it("handles tie in deviation — picks first occurrence", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ stamina: 0.8 }));
      collector.recordTick(0.9, makeTickValues({ stamina: 1.2 }));
      const ledger = collector.finalize();
      // Both deviate by 0.2; first occurrence wins
      expect(ledger.stamina.peakProgress).toBeCloseTo(0.1);
      expect(ledger.stamina.peakValue).toBeCloseTo(0.8);
    });
  });

  describe("raceAvg", () => {
    it("computes weighted average across all ticks", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ stamina: 0.9 }));
      collector.recordTick(0.5, makeTickValues({ stamina: 0.8 }));
      collector.recordTick(0.9, makeTickValues({ stamina: 0.7 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.raceAvg).toBeCloseTo((0.9 + 0.8 + 0.7) / 3);
    });

    it("raceAvg equals 1.0 when all ticks are 1.0", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues());
      collector.recordTick(0.5, makeTickValues());
      collector.recordTick(0.9, makeTickValues());
      const ledger = collector.finalize();
      expect(ledger.stamina.raceAvg).toBeCloseTo(1.0);
    });
  });

  describe("edge cases", () => {
    it("single tick — all phases get same values for the tick's phase, others default", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.5, makeTickValues({ stamina: 0.85 }));
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.mid.avg).toBeCloseTo(0.85);
      expect(ledger.stamina.phases.early.avg).toBe(1);
      expect(ledger.stamina.phases.early.min).toBe(1);
      expect(ledger.stamina.phases.early.max).toBe(1);
      expect(ledger.stamina.phases.late.avg).toBe(1);
      expect(ledger.stamina.phases.late.min).toBe(1);
      expect(ledger.stamina.phases.late.max).toBe(1);
    });

    it("all-1.0 multipliers — zero deviation, neutral impact", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues());
      collector.recordTick(0.5, makeTickValues());
      collector.recordTick(0.9, makeTickValues());
      const ledger = collector.finalize();
      for (const key of ALL_FACTORS) {
        expect(ledger[key].raceAvg).toBeCloseTo(1.0);
        expect(ledger[key].peakDeviation).toBeCloseTo(0);
        expect(ledger[key].peakValue).toBeCloseTo(1.0);
      }
    });

    it("runner DNFs early — phases with no data default to {avg:1, min:1, max:1}", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(0.1, makeTickValues({ stamina: 0.9 }));
      collector.recordTick(0.2, makeTickValues({ stamina: 0.85 }));
      // No mid or late ticks
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.early.avg).toBeCloseTo((0.9 + 0.85) / 2);
      expect(ledger.stamina.phases.mid.avg).toBe(1);
      expect(ledger.stamina.phases.mid.min).toBe(1);
      expect(ledger.stamina.phases.mid.max).toBe(1);
      expect(ledger.stamina.phases.late.avg).toBe(1);
      expect(ledger.stamina.phases.late.min).toBe(1);
      expect(ledger.stamina.phases.late.max).toBe(1);
    });

    it("empty collector — finalize returns all defaults", () => {
      const collector = new FactorLedgerCollector();
      const ledger = collector.finalize();
      for (const key of ALL_FACTORS) {
        expect(ledger[key].raceAvg).toBe(1);
        expect(ledger[key].peakDeviation).toBe(0);
        expect(ledger[key].phases.early.avg).toBe(1);
        expect(ledger[key].phases.mid.avg).toBe(1);
        expect(ledger[key].phases.late.avg).toBe(1);
      }
    });
  });

  describe("multiple factors in one tick", () => {
    it("records all factors from a single tick correctly", () => {
      const collector = new FactorLedgerCollector();
      collector.recordTick(
        0.5,
        makeTickValues({ stamina: 0.8, style: 1.1, draft: 1.05, wind: 0.95 }),
      );
      const ledger = collector.finalize();
      expect(ledger.stamina.phases.mid.avg).toBeCloseTo(0.8);
      expect(ledger.style.phases.mid.avg).toBeCloseTo(1.1);
      expect(ledger.draft.phases.mid.avg).toBeCloseTo(1.05);
      expect(ledger.wind.phases.mid.avg).toBeCloseTo(0.95);
    });
  });
});
