import { describe, expect, it } from "vitest";
import { computeRegionTrends, regionKeyForRace } from "@/core/analytics/regionalTrends";
import { isInWindow, weekBucket } from "@/core/analytics/timeWindow";
import type { Race } from "@/core/race/types";
import type { Horse } from "@/core/horse/types";
import { makePlayerOwned } from "@/core/horse/ownership";

const race = (id: string, track?: string, grade?: "G1") =>
  ({
    id,
    name: `Race ${id}`,
    day: 100,
    distance: 1600,
    entries: [],
    resolved: true,
    fieldSize: 10,
    entryFee: 0,
    purse: 100000,
    raceClass: "allowance",
    graded: track ? { key: id, grade: grade ?? "G1", track, surface: "Dirt" } : undefined,
  }) as unknown as Race;

const horse = (raceId: string, day: number, position: number, earned: number) =>
  ({
    id: "h1",
    name: "Tester",
    ownership: makePlayerOwned(),
    raceHistory: [
      {
        raceId,
        raceName: "r",
        position,
        day,
        purseEarned: earned,
        grade: "G1",
        jockeyId: "j1",
        stableId: "player",
      },
    ],
  }) as unknown as Horse;

describe("time window helpers", () => {
  it("includes only days inside the window", () => {
    expect(isInWindow(100, 100, 4)).toBe(true);
    expect(isInWindow(73, 100, 4)).toBe(true);
    expect(isInWindow(72, 100, 4)).toBe(false);
    expect(isInWindow(1, 100, 0)).toBe(true);
  });

  it("buckets recent days into the last bucket", () => {
    expect(weekBucket(100, 100, 4)).toBe(3);
    expect(weekBucket(73, 100, 4)).toBe(0);
  });
});

describe("computeRegionTrends", () => {
  it("aggregates earnings and G1 top-3 by region", () => {
    const r = race("r1", "Belmont Park");
    const rows = computeRegionTrends({
      horses: [horse("r1", 100, 1, 50000)],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].earnings).toBe(50000);
    expect(rows[0].g1Top3).toBe(1);
    expect(rows[0].weeklyEarnings[3]).toBe(50000);
  });

  it("falls back to 'other' when the track has no region", () => {
    expect(regionKeyForRace(race("r2", "Nowhere Downs"))).toBe("other");
    expect(regionKeyForRace(undefined)).toBe("other");
  });

  it("excludes runs outside the window", () => {
    const rows = computeRegionTrends({
      horses: [horse("r1", 10, 1, 50000)],
      races: [race("r1", "Belmont Park")],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
    });
    expect(rows).toHaveLength(0);
  });
});
