import { describe, it, expect } from "vitest";
import {
  appendCashPressureSnapshot,
  pruneCashPressureHistory,
  CASH_PRESSURE_HISTORY_MAX,
  type CashPressureSnapshot,
  type CashPressureHistory,
} from "@/core/stable/cashPressureHistory";

const mkSnapshot = (day: number, meter = 50): CashPressureSnapshot => ({
  day,
  pressure: meter / 100,
  meter,
  runwayDays: 100 - meter,
  label:
    meter >= 75 ? "desperate" : meter >= 50 ? "strained" : meter >= 25 ? "tight" : "comfortable",
});

describe("CASH_PRESSURE_HISTORY_MAX", () => {
  it("is 90", () => {
    expect(CASH_PRESSURE_HISTORY_MAX).toBe(90);
  });
});

describe("appendCashPressureSnapshot", () => {
  it("appends to an empty history", () => {
    const result = appendCashPressureSnapshot({}, "s1", mkSnapshot(1));
    expect(result.s1).toHaveLength(1);
    expect(result.s1[0].day).toBe(1);
  });

  it("appends to an existing stable's history", () => {
    const history: CashPressureHistory = { s1: [mkSnapshot(1)] };
    const result = appendCashPressureSnapshot(history, "s1", mkSnapshot(2));
    expect(result.s1).toHaveLength(2);
    expect(result.s1[0].day).toBe(1);
    expect(result.s1[1].day).toBe(2);
  });

  it("preserves other stables' histories", () => {
    const history: CashPressureHistory = { s1: [mkSnapshot(1)], s2: [mkSnapshot(1)] };
    const result = appendCashPressureSnapshot(history, "s1", mkSnapshot(2));
    expect(result.s1).toHaveLength(2);
    expect(result.s2).toHaveLength(1);
  });

  it("caps at CASH_PRESSURE_HISTORY_MAX (90), evicting oldest (FIFO)", () => {
    let history: CashPressureHistory = {};
    for (let i = 1; i <= 95; i++) {
      history = appendCashPressureSnapshot(history, "s1", mkSnapshot(i));
    }
    expect(history.s1).toHaveLength(90);
    // First 5 evicted, so first entry is day 6
    expect(history.s1[0].day).toBe(6);
    expect(history.s1[89].day).toBe(95);
  });

  it("does not mutate the input history", () => {
    const history: CashPressureHistory = { s1: [mkSnapshot(1)] };
    appendCashPressureSnapshot(history, "s1", mkSnapshot(2));
    expect(history.s1).toHaveLength(1);
  });
});

describe("pruneCashPressureHistory", () => {
  it("removes histories for stable IDs not in the live set", () => {
    const history: CashPressureHistory = {
      s1: [mkSnapshot(1)],
      s2: [mkSnapshot(1)],
      s3: [mkSnapshot(1)],
    };
    const result = pruneCashPressureHistory(history, new Set(["s1", "s3"]));
    expect(result.s1).toBeDefined();
    expect(result.s2).toBeUndefined();
    expect(result.s3).toBeDefined();
  });

  it("handles empty input", () => {
    const result = pruneCashPressureHistory({}, new Set(["s1"]));
    expect(result).toEqual({});
  });

  it("handles empty live set", () => {
    const history: CashPressureHistory = { s1: [mkSnapshot(1)] };
    const result = pruneCashPressureHistory(history, new Set());
    expect(result).toEqual({});
  });

  it("does not mutate the input history", () => {
    const history: CashPressureHistory = { s1: [mkSnapshot(1)], s2: [mkSnapshot(1)] };
    pruneCashPressureHistory(history, new Set(["s1"]));
    expect(history.s2).toBeDefined();
  });
});
