import { describe, it, expect } from "vitest";
import { evaluatePrivateSaleThresholds } from "@/core/stable/privateSaleThresholds";
import {
  recordCashPressureDecision,
  summarizeCashPressureTraces,
  clearCashPressureTraces,
  getCashPressureTraces,
} from "@/core/stable/cashPressureLog";
import { createTestStable } from "@/tests/helpers/createTestStable";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];

describe("evaluatePrivateSaleThresholds", () => {
  it("discounts the accept threshold for a cash-strapped stable", () => {
    const rich = createTestStable({ cash: 5_000_000, horses });
    const poor = createTestStable({ cash: 1_000, horses });
    const a = evaluatePrivateSaleThresholds(rich);
    const b = evaluatePrivateSaleThresholds(poor);
    expect(b.acceptThreshold).toBeLessThan(a.acceptThreshold);
    expect(b.cashPressure.meter).toBeGreaterThan(a.cashPressure.meter);
  });

  it("reports shortfall and projected outcome against an ask", () => {
    const stable = createTestStable({ cash: 5_000_000, horses });
    const t = evaluatePrivateSaleThresholds(stable, { ask: 100_000, offerAmount: 40_000 });
    expect(t.projectedOutcome).toBe("declined");
    expect(t.shortfallAmount).toBe(Math.round(100_000 * t.acceptThreshold) - 40_000);
    expect(t.shortfallPercent).toBeGreaterThan(0);

    const good = evaluatePrivateSaleThresholds(stable, { ask: 100_000, offerAmount: 120_000 });
    expect(good.projectedOutcome).toBe("accepted");
    expect(good.shortfallAmount).toBe(0);
  });
});

describe("cash pressure trace summary", () => {
  it("aggregates outcomes and meters", () => {
    clearCashPressureTraces();
    const base = {
      day: 1,
      stableId: "s1",
      stableName: "S",
      personality: "aggressive",
      horseName: "H",
      cash: 100,
      runwayDays: 10,
      pressure: 0.8,
      meter: 80,
      pressureLabel: "desperate",
      ask: 100_000,
      offerAmount: 60_000,
      offerRatio: 0.6,
      baseAcceptThreshold: 0.7,
      acceptThreshold: 0.56,
      counterThreshold: 0.4,
      shortfallAmount: 0,
      shortfallPercent: 0,
    };
    recordCashPressureDecision({ ...base, outcome: "accepted" });
    recordCashPressureDecision({ ...base, outcome: "countered", counterAmount: 90_000 });
    expect(getCashPressureTraces().length).toBe(2);

    const summary = summarizeCashPressureTraces();
    expect(summary.total).toBe(2);
    expect(summary.accepted).toBe(1);
    expect(summary.countered).toBe(1);
    expect(summary.averageMeter).toBe(80);
    expect(summary.averageCounterTerms).toBe(90_000);
    expect(summary.lowballAccepts).toBe(1);
    clearCashPressureTraces();
  });
});
