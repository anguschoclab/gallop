import { describe, expect, it } from "vitest";
import {
  collectRegionRuns,
  computeRegionDrilldown,
  type RegionKey,
} from "@/core/analytics/regionalTrends";
import type { Race } from "@/core/race/types";
import type { Horse } from "@/core/horse/types";

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

const horseWithSurface = (
  raceId: string,
  day: number,
  position: number,
  earned: number,
  surface: string | undefined,
  distance: number | undefined,
  track = "Belmont Park",
) =>
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
        grade: "G1",
        jockeyId: "j1",
        stableId: "player",
        surface,
        distance,
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

describe("collectRegionRuns — surface filter", () => {
  it("filters to only matching capitalized surface values", () => {
    const r = race("r1", "Belmont Park");
    const h1 = horseWithSurface("r1", 100, 1, 50000, "Turf", 1600);
    const h2 = {
      ...horseWithSurface("r1", 100, 2, 0, "Dirt", 1600),
      id: "h2",
    } as unknown as Horse;
    const rows = collectRegionRuns({
      horses: [h1, h2],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      surface: ["Turf"],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entry.surface).toBe("Turf");
  });

  it("excludes runs with undefined surface when filter is active", () => {
    const r = race("r1", "Belmont Park");
    const h = horseWithSurface("r1", 100, 1, 50000, undefined, 1600);
    const rows = collectRegionRuns({
      horses: [h],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      surface: ["Turf"],
    });
    expect(rows).toHaveLength(0);
  });

  it("includes all runs when surface filter is empty array", () => {
    const r = race("r1", "Belmont Park");
    const h1 = horseWithSurface("r1", 100, 1, 50000, "Turf", 1600);
    const h2 = {
      ...horseWithSurface("r1", 100, 2, 0, "Dirt", 1600),
      id: "h2",
    } as unknown as Horse;
    const rows = collectRegionRuns({
      horses: [h1, h2],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      surface: [],
    });
    expect(rows).toHaveLength(2);
  });

  it("includes all runs when surface filter is omitted", () => {
    const r = race("r1", "Belmont Park");
    const h = horseWithSurface("r1", 100, 1, 50000, undefined, 1600);
    const rows = collectRegionRuns({
      horses: [h],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
    });
    expect(rows).toHaveLength(1);
  });
});

describe("collectRegionRuns — distance filter (meters)", () => {
  it("distMin excludes runs below the minimum", () => {
    const r = race("r1", "Belmont Park");
    const h1 = horseWithSurface("r1", 100, 1, 50000, "Dirt", 1200);
    const h2 = {
      ...horseWithSurface("r1", 100, 2, 0, "Dirt", 1600),
      id: "h2",
    } as unknown as Horse;
    const rows = collectRegionRuns({
      horses: [h1, h2],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      distMin: 1400,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entry.distance).toBe(1600);
  });

  it("distMax excludes runs above the maximum", () => {
    const r = race("r1", "Belmont Park");
    const h1 = horseWithSurface("r1", 100, 1, 50000, "Dirt", 2200);
    const h2 = {
      ...horseWithSurface("r1", 100, 2, 0, "Dirt", 1600),
      id: "h2",
    } as unknown as Horse;
    const rows = collectRegionRuns({
      horses: [h1, h2],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      distMax: 2000,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entry.distance).toBe(1600);
  });

  it("combined distMin and distMax includes only in-range runs", () => {
    const r = race("r1", "Belmont Park");
    const horses = [
      horseWithSurface("r1", 100, 1, 50000, "Dirt", 1200),
      { ...horseWithSurface("r1", 100, 2, 0, "Dirt", 1500), id: "h2" } as unknown as Horse,
      { ...horseWithSurface("r1", 100, 3, 0, "Dirt", 2200), id: "h3" } as unknown as Horse,
    ];
    const rows = collectRegionRuns({
      horses,
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      distMin: 1400,
      distMax: 2000,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entry.distance).toBe(1500);
  });

  it("excludes runs with undefined distance when filter is active", () => {
    const r = race("r1", "Belmont Park");
    const h = horseWithSurface("r1", 100, 1, 50000, "Dirt", undefined);
    const rows = collectRegionRuns({
      horses: [h],
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      distMin: 1400,
    });
    expect(rows).toHaveLength(0);
  });
});

describe("collectRegionRuns — combined surface + distance filters", () => {
  it("applies both surface and distance filters together", () => {
    const r = race("r1", "Belmont Park");
    const horses = [
      horseWithSurface("r1", 100, 1, 50000, "Turf", 1200),
      { ...horseWithSurface("r1", 100, 2, 0, "Turf", 1600), id: "h2" } as unknown as Horse,
      { ...horseWithSurface("r1", 100, 3, 0, "Dirt", 1600), id: "h3" } as unknown as Horse,
    ];
    const rows = collectRegionRuns({
      horses,
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      surface: ["Turf"],
      distMin: 1400,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entry.surface).toBe("Turf");
    expect(rows[0]!.entry.distance).toBe(1600);
  });
});

describe("computeRegionDrilldown — filters propagate", () => {
  it("drilldown runs respect surface filter", () => {
    const r = race("r1", "Belmont Park");
    const horses = [
      horseWithSurface("r1", 100, 1, 50000, "Turf", 1600),
      { ...horseWithSurface("r1", 100, 2, 0, "Dirt", 1600), id: "h2" } as unknown as Horse,
    ];
    const region: RegionKey = "usa";
    const result = computeRegionDrilldown({
      horses,
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      surface: ["Turf"],
      ...lookups,
    });
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]!.entry.surface).toBe("Turf");
  });

  it("drilldown runs respect distance filter", () => {
    const r = race("r1", "Belmont Park");
    const horses = [
      horseWithSurface("r1", 100, 1, 50000, "Dirt", 1200),
      { ...horseWithSurface("r1", 100, 2, 0, "Dirt", 1600), id: "h2" } as unknown as Horse,
    ];
    const region: RegionKey = "usa";
    const result = computeRegionDrilldown({
      horses,
      races: [r],
      currentDay: 100,
      weeks: 4,
      ownedOnly: true,
      region,
      distMin: 1400,
      ...lookups,
    });
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]!.entry.distance).toBe(1600);
  });
});
