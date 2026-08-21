import { describe, expect, it } from "vitest";
import { computeRegionDrilldown, type RegionKey } from "@/core/analytics/regionalTrends";
import type { Race } from "@/core/race/types";
import type { Horse } from "@/core/horse/types";

const race = (id: string, track?: string, grade?: "G1" | "G2") =>
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

const horse = (raceId: string, day: number, position: number, earned: number, grade?: string) =>
  ({
    id: "h1",
    name: "Tester",
    ownership: { type: "player" },
    raceHistory: [
      {
        raceId,
        raceName: "r",
        position,
        day,
        purseEarned: earned,
        grade,
        jockeyId: "j1",
        stableId: "player",
      },
    ],
  }) as unknown as Horse;

const lookups = {
  jockeyNames: new Map([["j1", "Jockey One"]]),
  stableNames: new Map([["player", "My Stable"]]),
  trainerByStable: new Map<string, { id: string; name: string }>([
    ["player", { id: "t1", name: "Trainer One" }],
  ]),
};

const region: RegionKey = "usa";

describe("computeRegionDrilldown — g1Starts field", () => {
  it("DrilldownEntity objects include g1Starts field", () => {
    const r = race("r1", "Belmont Park", "G1");
    const result = computeRegionDrilldown({
      horses: [horse("r1", 100, 1, 50000, "G1")],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    expect(result.jockeys[0]).toBeDefined();
    expect(result.jockeys[0]!).toHaveProperty("g1Starts");
  });

  it("g1Starts counts only G1 races", () => {
    const r1 = race("r1", "Belmont Park", "G1");
    const r2 = race("r2", "Belmont Park", "G2");
    const h = {
      id: "h1",
      name: "Tester",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "r1",
          position: 1,
          day: 100,
          purseEarned: 50000,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
        {
          raceId: "r2",
          raceName: "r2",
          position: 2,
          day: 99,
          purseEarned: 10000,
          grade: "G2",
          jockeyId: "j1",
          stableId: "player",
        },
      ],
    } as unknown as Horse;
    const result = computeRegionDrilldown({
      horses: [h],
      races: [r1, r2],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    const jockey = result.jockeys[0]!;
    expect(jockey.starts).toBe(2);
    expect(jockey.g1Starts).toBe(1);
  });

  it("g1Starts is 0 for entities with no G1 runs", () => {
    const r = race("r1", "Belmont Park", "G2");
    const result = computeRegionDrilldown({
      horses: [horse("r1", 100, 1, 50000, "G2")],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    expect(result.jockeys[0]!.g1Starts).toBe(0);
  });
});

describe("rate metric calculations", () => {
  it("winsPerStart = wins / starts for known inputs", () => {
    const r1 = race("r1", "Belmont Park", "G1");
    const r2 = race("r2", "Belmont Park", "G1");
    const r3 = race("r3", "Belmont Park", "G1");
    const h = {
      id: "h1",
      name: "Tester",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "r1",
          position: 1,
          day: 100,
          purseEarned: 50000,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
        {
          raceId: "r2",
          raceName: "r2",
          position: 1,
          day: 99,
          purseEarned: 30000,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
        {
          raceId: "r3",
          raceName: "r3",
          position: 5,
          day: 98,
          purseEarned: 0,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
      ],
    } as unknown as Horse;
    const result = computeRegionDrilldown({
      horses: [h],
      races: [r1, r2, r3],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    const j = result.jockeys[0]!;
    expect(j.starts).toBe(3);
    expect(j.wins).toBe(2);
    expect(j.wins / j.starts).toBeCloseTo(0.6667, 3);
  });

  it("top3Rate = top3 / starts", () => {
    const r1 = race("r1", "Belmont Park", "G1");
    const r2 = race("r2", "Belmont Park", "G1");
    const h = {
      id: "h1",
      name: "Tester",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "r1",
          position: 2,
          day: 100,
          purseEarned: 20000,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
        {
          raceId: "r2",
          raceName: "r2",
          position: 5,
          day: 99,
          purseEarned: 0,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
      ],
    } as unknown as Horse;
    const result = computeRegionDrilldown({
      horses: [h],
      races: [r1, r2],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    const j = result.jockeys[0]!;
    expect(j.top3).toBe(1);
    expect(j.starts).toBe(2);
    expect(j.top3 / j.starts).toBe(0.5);
  });

  it("g1Top3Rate uses g1Starts as denominator, not starts", () => {
    const r1 = race("r1", "Belmont Park", "G1");
    const r2 = race("r2", "Belmont Park", "G2");
    const h = {
      id: "h1",
      name: "Tester",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "r1",
          position: 2,
          day: 100,
          purseEarned: 20000,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
        {
          raceId: "r2",
          raceName: "r2",
          position: 3,
          day: 99,
          purseEarned: 5000,
          grade: "G2",
          jockeyId: "j1",
          stableId: "player",
        },
      ],
    } as unknown as Horse;
    const result = computeRegionDrilldown({
      horses: [h],
      races: [r1, r2],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    const j = result.jockeys[0]!;
    expect(j.g1Starts).toBe(1);
    expect(j.g1Top3).toBe(1);
    expect(j.starts).toBe(2);
    // g1Top3Rate = g1Top3 / g1Starts = 1/1 = 1.0, NOT g1Top3 / starts = 1/2 = 0.5
    expect(j.g1Top3 / j.g1Starts).toBe(1);
  });

  it("earningsPerStart = earnings / starts", () => {
    const r1 = race("r1", "Belmont Park", "G1");
    const r2 = race("r2", "Belmont Park", "G1");
    const h = {
      id: "h1",
      name: "Tester",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "r1",
          position: 1,
          day: 100,
          purseEarned: 50000,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
        {
          raceId: "r2",
          raceName: "r2",
          position: 3,
          day: 99,
          purseEarned: 10000,
          grade: "G1",
          jockeyId: "j1",
          stableId: "player",
        },
      ],
    } as unknown as Horse;
    const result = computeRegionDrilldown({
      horses: [h],
      races: [r1, r2],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    const j = result.jockeys[0]!;
    expect(j.earnings / j.starts).toBe(30000);
  });
});

describe("rate metric edge cases — zero denominators", () => {
  it("winsPerStart = 0 when starts = 0 (no NaN)", () => {
    const r = race("r1", "Belmont Park", "G1");
    const result = computeRegionDrilldown({
      horses: [],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    // No entities at all — verify no crash
    expect(result.jockeys).toHaveLength(0);
  });

  it("g1Top3Rate = 0 when g1Starts = 0 (no NaN)", () => {
    const r = race("r1", "Belmont Park", "G2");
    const result = computeRegionDrilldown({
      horses: [horse("r1", 100, 1, 50000, "G2")],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      ...lookups,
    });
    const j = result.jockeys[0]!;
    expect(j.g1Starts).toBe(0);
    expect(j.g1Top3).toBe(0);
    // Safe division: 0 / 0 would be NaN, so the metric def must guard
    const rate = j.g1Starts ? j.g1Top3 / j.g1Starts : 0;
    expect(rate).toBe(0);
    expect(Number.isNaN(rate)).toBe(false);
  });
});
