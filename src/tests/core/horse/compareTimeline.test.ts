import { describe, it, expect } from "vitest";
import {
  recentSnapshots,
  windowChange,
  type HorseDailySnapshot,
} from "@/domains/horse/simulation/dailyProgress";

const snap = (day: number, ovr: number, form: number, price: number): HorseDailySnapshot => ({
  day,
  speed: 0,
  stamina: 0,
  acceleration: 0,
  consistency: 0,
  ovr,
  form,
  energy: 0,
  price,
});

describe("Compare 7-day timeline", () => {
  const snaps = Array.from({ length: 10 }, (_, i) => snap(i + 1, 50 + i, 60 - i, 10_000 + i * 500));

  it("keeps only the last 7 days, oldest first", () => {
    const recent = recentSnapshots(snaps, 10);
    expect(recent.map((s) => s.day)).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it("measures rating, form and price change across the window", () => {
    const recent = recentSnapshots(snaps, 10);
    expect(windowChange(recent, "ovr")).toBe(6);
    expect(windowChange(recent, "form")).toBe(-6);
    expect(windowChange(recent, "price")).toBe(3_000);
  });

  it("has no change with a single day recorded", () => {
    expect(windowChange(recentSnapshots(snaps, 1), "ovr")).toBeUndefined();
  });
});
