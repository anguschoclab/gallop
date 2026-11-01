import { describe, it, expect } from "vitest";
import {
  dailyStatsSummary,
  dailySummaryTotals,
} from "@/domains/dashboard/simulation/dailyStatsSummary";
import type { HorseDailySnapshot } from "@/domains/horse/simulation/dailyProgress";

const snap = (
  day: number,
  ovr: number,
  form: number,
  energy: number,
  price: number,
): HorseDailySnapshot => ({
  day,
  speed: 0,
  stamina: 0,
  acceleration: 0,
  consistency: 0,
  ovr,
  form,
  energy,
  price,
});

const progress = {
  a: Array.from({ length: 10 }, (_, i) =>
    snap(i + 1, 50 + i, 60 - i, 90 - i * 2, 10_000 + i * 500),
  ),
  b: [snap(9, 70, 50, 80, 20_000), snap(10, 69, 52, 70, 19_000)],
  c: [snap(10, 40, 40, 100, 5_000)],
};

describe("Dashboard daily stats summary", () => {
  it("compares today with the previous day", () => {
    const [a] = dailyStatsSummary(progress, ["a"], 10, "day");
    expect(a.latest?.day).toBe(10);
    expect(a.changes).toEqual({ ovr: 1, form: -1, energy: -2, price: 500 });
  });

  it("compares today with 6 days ago over the 7-day window", () => {
    const [a] = dailyStatsSummary(progress, ["a"], 10, "week");
    expect(a.changes).toEqual({ ovr: 6, form: -6, energy: -12, price: 3_000 });
    expect(a.priceTrend).toHaveLength(7);
  });

  it("shows no change for a horse with only today's record", () => {
    const [c] = dailyStatsSummary(progress, ["c"], 10, "day");
    expect(c.latest?.price).toBe(5_000);
    expect(c.changes.ovr).toBeUndefined();
  });

  it("totals stable value change and counts improving vs declining horses", () => {
    const rows = dailyStatsSummary(progress, ["a", "b", "c"], 10, "day");
    expect(dailySummaryTotals(rows)).toEqual({ valueChange: -500, improving: 1, declining: 1 });
  });
});
