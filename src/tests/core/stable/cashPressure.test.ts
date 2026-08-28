import { describe, it, expect, afterEach } from "vitest";
import { evaluateCashPressure, applyCashPressureToThreshold } from "@/core/stable/cashPressure";
import {
  setCashPressureTuningOverrides,
  resetCashPressureTuningOverrides,
  getCashPressureTuning,
} from "@/core/stable/cashPressureTuning";
import { UPKEEP_PER_HORSE } from "@/constants/economicConstants";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { asHorseId } from "@/core/types/branded";

const roster = (n: number) => Array.from({ length: n }, (_, i) => asHorseId(`h${i}`));

/** Build a stable whose cash yields an exact runway (in days of upkeep). */
const stableWithRunway = (runwayDays: number, horses = 10) =>
  createTestStable({ cash: runwayDays * horses * UPKEEP_PER_HORSE, horses: roster(horses) });

describe("cashPressure", () => {
  it("rich stables feel no pressure", () => {
    const s = createTestStable({ cash: 5_000_000, horses: roster(10) });
    const r = evaluateCashPressure(s);
    expect(r.pressure).toBe(0);
    expect(r.label).toBe("comfortable");
  });

  it("nearly broke stables are desperate", () => {
    const s = createTestStable({ cash: 1000, horses: roster(20) });
    const r = evaluateCashPressure(s);
    expect(r.pressure).toBe(1);
    expect(r.label).toBe("desperate");
  });

  it("pressure increases as cash falls", () => {
    const high = evaluateCashPressure(createTestStable({ cash: 200_000, horses: roster(20) }));
    const low = evaluateCashPressure(createTestStable({ cash: 60_000, horses: roster(20) }));
    expect(low.pressure).toBeGreaterThan(high.pressure);
  });

  it("discounts thresholds under pressure", () => {
    expect(applyCashPressureToThreshold(1.0, 0)).toBe(1.0);
    expect(applyCashPressureToThreshold(1.0, 1)).toBeCloseTo(0.75);
    expect(applyCashPressureToThreshold(1.0, 0.5)).toBeLessThan(1.0);
  });

  // ── Runway-edge coverage (0%, 25%, 50%, 75%, 100% pressure) ───────────────
  describe("runway edges", () => {
    // Default tuning: comfortDays=120, crisisDays=20, span=100.
    // runway = comfortDays - pressure * span  (linear, exponent=1)
    const edges: Array<{ pct: number; runway: number; label: string }> = [
      { pct: 0.0, runway: 120, label: "comfortable" },
      { pct: 0.25, runway: 95, label: "tight" },
      { pct: 0.5, runway: 70, label: "strained" },
      { pct: 0.75, runway: 45, label: "desperate" },
      { pct: 1.0, runway: 20, label: "desperate" },
    ];

    for (const edge of edges) {
      it(`pressure=${edge.pct * 100}% at runway=${edge.runway}d → label "${edge.label}"`, () => {
        const s = stableWithRunway(edge.runway);
        const r = evaluateCashPressure(s);
        expect(r.runwayDays).toBeCloseTo(edge.runway, 5);
        expect(r.pressure).toBeCloseTo(edge.pct, 5);
        expect(r.label).toBe(edge.label);
      });
    }

    it("threshold softening tracks pressure at each edge", () => {
      const maxDiscount = getCashPressureTuning().maxThresholdDiscount;
      for (const edge of edges) {
        const softened = applyCashPressureToThreshold(1.0, edge.pct);
        expect(softened).toBeCloseTo(1 - maxDiscount * edge.pct, 5);
      }
    });

    it("0% pressure: no softening (threshold unchanged)", () => {
      expect(applyCashPressureToThreshold(0.8, 0)).toBe(0.8);
    });

    it("100% pressure: full softening (threshold * (1 - maxDiscount))", () => {
      const maxDiscount = getCashPressureTuning().maxThresholdDiscount;
      expect(applyCashPressureToThreshold(0.8, 1)).toBeCloseTo(0.8 * (1 - maxDiscount), 5);
    });
  });

  // ── Curve-shape exponents ─────────────────────────────────────────────────
  describe("curve shape", () => {
    afterEach(() => resetCashPressureTuningOverrides());

    it("pressureCurveExponent > 1 keeps pressure low until runway nears crisis", () => {
      const mid = stableWithRunway(70); // 50% linear pressure
      const linear = evaluateCashPressure(mid).pressure;
      setCashPressureTuningOverrides({ pressureCurveExponent: 2 });
      const curved = evaluateCashPressure(mid).pressure;
      expect(curved).toBeLessThan(linear);
      expect(curved).toBeCloseTo(0.25, 5); // 0.5^2
    });

    it("pressureCurveExponent < 1 ramps pressure early", () => {
      const mid = stableWithRunway(70);
      const linear = evaluateCashPressure(mid).pressure;
      setCashPressureTuningOverrides({ pressureCurveExponent: 0.5 });
      const curved = evaluateCashPressure(mid).pressure;
      expect(curved).toBeGreaterThan(linear);
      expect(curved).toBeCloseTo(Math.sqrt(0.5), 5); // 0.5^0.5
    });

    it("softeningCurveExponent > 1 softens less at mid-pressure", () => {
      setCashPressureTuningOverrides({ softeningCurveExponent: 2 });
      const softened = applyCashPressureToThreshold(1.0, 0.5);
      // 1 - 0.25 * (0.5^2) = 1 - 0.0625 = 0.9375
      expect(softened).toBeCloseTo(0.9375, 5);
      resetCashPressureTuningOverrides();
      const linear = applyCashPressureToThreshold(1.0, 0.5);
      expect(softened).toBeGreaterThan(linear);
    });

    it("softeningCurveExponent < 1 softens more at mid-pressure", () => {
      setCashPressureTuningOverrides({ softeningCurveExponent: 0.5 });
      const softened = applyCashPressureToThreshold(1.0, 0.5);
      // 1 - 0.25 * sqrt(0.5) ≈ 1 - 0.1768 = 0.8232
      expect(softened).toBeLessThan(0.875); // less than linear (0.875)
      resetCashPressureTuningOverrides();
    });
  });

  // ── Tuning overrides ──────────────────────────────────────────────────────
  describe("tuning overrides", () => {
    afterEach(() => resetCashPressureTuningOverrides());

    it("comfortDays override shifts the zero-pressure runway", () => {
      const s = stableWithRunway(60, 10); // 60d runway
      const baseline = evaluateCashPressure(s).pressure;
      setCashPressureTuningOverrides({ comfortDays: 60 });
      const after = evaluateCashPressure(s).pressure;
      expect(after).toBeLessThan(baseline);
      expect(after).toBeCloseTo(0, 5); // 60d == comfort → 0 pressure
    });

    it("crisisDays override shifts the full-pressure runway", () => {
      const s = stableWithRunway(40, 10);
      const baseline = evaluateCashPressure(s).pressure;
      setCashPressureTuningOverrides({ crisisDays: 40 });
      const after = evaluateCashPressure(s).pressure;
      expect(after).toBeGreaterThan(baseline);
      expect(after).toBeCloseTo(1, 5); // 40d == crisis → 1 pressure
    });

    it("maxThresholdDiscount override changes softening depth", () => {
      setCashPressureTuningOverrides({ maxThresholdDiscount: 0.5 });
      expect(applyCashPressureToThreshold(1.0, 1)).toBeCloseTo(0.5, 5);
      resetCashPressureTuningOverrides();
      expect(applyCashPressureToThreshold(1.0, 1)).toBeCloseTo(0.75, 5);
    });
  });
});
