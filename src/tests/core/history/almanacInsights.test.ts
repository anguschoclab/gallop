/**
 * almanacInsights.test.ts - Tests for buildTrackMilestones, buildDecadeLeaders,
 * buildTrackTimeline, compareToRealWorld
 *
 * Written BEFORE the H5 tallyRecordHolders extraction (Phase 0.4). Locks down
 * the almanac builder behaviour so the extraction can be verified against it.
 */

import { describe, it, expect } from "vitest";
import {
  recordSpeed,
  buildTrackMilestones,
  buildDecadeLeaders,
  buildTrackTimeline,
  compareToRealWorld,
  runsForHorse,
  computeHorseBenchmarkStanding,
} from "@/core/history/almanacInsights";
import {
  getTripCategory,
  getRealWorldRecords,
  type RealWorldRecord,
} from "@/data/realWorldRecords";
import type { TrackRecord, SeasonRecord } from "@/core/history/historyTypes";

function mkRecord(
  overrides: Partial<TrackRecord> & { trackId: string; horseId: string },
): TrackRecord {
  return {
    trackName: "Test Track",
    surface: "Turf",
    distance: 1600,
    time: 95,
    horseName: "Test Horse",
    day: 10,
    year: 2020,
    ...overrides,
  };
}

function mkSeason(overrides: Partial<SeasonRecord> & { id: string }): SeasonRecord {
  return {
    year: 2020,
    day: 10,
    raceId: "r1",
    raceName: "Test Race",
    winnerId: "w1",
    winnerName: "Winner",
    winnerSilk: "#fff",
    time: 95,
    jockeyId: "j1",
    jockeyName: "Jockey",
    grade: "G1",
    isPlayerOwned: false,
    ...overrides,
  };
}

describe("recordSpeed", () => {
  it("computes metres per second", () => {
    expect(recordSpeed({ distance: 1600, time: 80 })).toBe(20);
    expect(recordSpeed({ distance: 2400, time: 120 })).toBe(20);
  });
});

describe("buildTrackMilestones", () => {
  it("groups records by track", () => {
    const records = [
      mkRecord({ trackId: "t1", trackName: "Track A", horseId: "h1" }),
      mkRecord({ trackId: "t2", trackName: "Track B", horseId: "h2" }),
    ];
    const milestones = buildTrackMilestones(records, []);
    expect(milestones).toHaveLength(2);
    expect(milestones.map((m) => m.trackName).sort()).toEqual(["Track A", "Track B"]);
  });

  it("finds the fastest record (by speed = distance/time) and tallies multi-record holders", () => {
    const records = [
      mkRecord({
        trackId: "t1",
        horseId: "h1",
        horseName: "Fast",
        time: 90,
        day: 5,
        year: 2020,
        distance: 1600,
      }),
      mkRecord({
        trackId: "t1",
        horseId: "h2",
        horseName: "Slow",
        time: 100,
        day: 10,
        year: 2021,
        distance: 1600,
      }),
      mkRecord({
        trackId: "t1",
        horseId: "h1",
        horseName: "Fast",
        time: 95,
        day: 15,
        year: 2022,
        distance: 1600,
      }),
    ];
    const milestones = buildTrackMilestones(records, []);
    expect(milestones).toHaveLength(1);
    const m = milestones[0];
    // All same distance, so fastest = lowest time = 90s
    expect(m.fastest?.horseName).toBe("Fast");
    expect(m.fastest?.time).toBe(90);
    expect(m.earliest?.year).toBe(2020);
    expect(m.latest?.year).toBe(2022);
    const h1 = m.multiRecordHolders.find((h) => h.horseId === "h1");
    expect(h1?.count).toBe(2);
  });

  it("counts G1 results from season records whose raceName includes the trackName", () => {
    const records = [mkRecord({ trackId: "t1", trackName: "Test Track", horseId: "h1" })];
    const seasons = [mkSeason({ id: "s1", raceName: "Test Track Stakes", grade: "G1" })];
    const milestones = buildTrackMilestones(records, seasons);
    expect(milestones[0].g1Count).toBe(1);
  });

  it("returns empty for no records", () => {
    expect(buildTrackMilestones([], [])).toHaveLength(0);
  });
});

describe("buildDecadeLeaders", () => {
  it("groups by decade and ranks top by speed", () => {
    const records = [
      mkRecord({
        trackId: "t1",
        horseId: "h1",
        horseName: "Fast",
        time: 80,
        year: 2021,
        distance: 1600,
      }),
      mkRecord({
        trackId: "t1",
        horseId: "h2",
        horseName: "Slow",
        time: 100,
        year: 2022,
        distance: 1600,
      }),
    ];
    const decades = buildDecadeLeaders(records, 5);
    expect(decades).toHaveLength(1);
    expect(decades[0].top[0].horseName).toBe("Fast");
  });

  it("tallies prolific record holders", () => {
    const records = [
      mkRecord({
        trackId: "t1",
        horseId: "h1",
        horseName: "A",
        time: 80,
        year: 2021,
        distance: 1600,
      }),
      mkRecord({
        trackId: "t1",
        horseId: "h1",
        horseName: "A",
        time: 85,
        year: 2022,
        distance: 1800,
      }),
      mkRecord({
        trackId: "t1",
        horseId: "h2",
        horseName: "B",
        time: 90,
        year: 2023,
        distance: 1600,
      }),
    ];
    const decades = buildDecadeLeaders(records, 5);
    const prolific = decades[0].prolific;
    expect(prolific.find((h) => h.horseId === "h1")?.count).toBe(2);
    expect(prolific.find((h) => h.horseId === "h2")?.count).toBe(1);
  });

  it("returns empty for no records", () => {
    expect(buildDecadeLeaders([])).toHaveLength(0);
  });
});

describe("buildTrackTimeline", () => {
  it("returns events sorted by day descending", () => {
    const records = [mkRecord({ trackId: "t1", horseId: "h1", day: 5, year: 2020 })];
    const seasons = [
      mkSeason({ id: "s1", day: 10, year: 2021, raceName: "Late Race" }),
      mkSeason({ id: "s2", day: 5, year: 2020, raceName: "Early Race" }),
    ];
    const events = buildTrackTimeline(records, seasons);
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].day).toBeGreaterThanOrEqual(events[i].day);
    }
  });

  it("filters by trackId when provided", () => {
    const records = [
      mkRecord({ trackId: "t1", horseId: "h1", day: 5, year: 2020 }),
      mkRecord({ trackId: "t2", horseId: "h2", day: 6, year: 2020 }),
    ];
    const events = buildTrackTimeline(records, [], "t1");
    expect(
      events.every((e) => e.title.includes("Test Track") || !e.title.includes("Track B")),
    ).toBe(true);
  });
});

describe("compareToRealWorld", () => {
  it("matches the closest in-game record by surface and distance", () => {
    // Secretariat Belmont: Dirt, 2414m, 144s
    const records = [
      mkRecord({
        trackId: "t1",
        horseId: "h1",
        horseName: "Game Horse",
        surface: "Dirt",
        distance: 2400,
        time: 150,
      }),
    ];
    const comparisons = compareToRealWorld(records);
    const belmont = comparisons.find((c) => c.benchmark.id === "rw-secretariat-belmont");
    expect(belmont?.gameRecord).toBeDefined();
    expect(belmont?.gameRecord?.horseName).toBe("Game Horse");
  });

  it("returns no gameRecord when nothing matches", () => {
    const comparisons = compareToRealWorld([]);
    for (const c of comparisons) {
      expect(c.gameRecord).toBeUndefined();
    }
  });

  it("computes speedDeltaPct (positive = faster than benchmark)", () => {
    const records = [
      mkRecord({
        trackId: "t1",
        horseId: "h1",
        horseName: "Speedy",
        surface: "Dirt",
        distance: 2400,
        time: 140,
      }),
    ];
    const comparisons = compareToRealWorld(records);
    const belmont = comparisons.find((c) => c.benchmark.id === "rw-secretariat-belmont");
    // 2400/140 ≈ 17.14 m/s vs 2414/144 ≈ 16.76 m/s → positive delta
    expect(belmont?.speedDeltaPct).toBeGreaterThan(0);
  });
});

describe("runsForHorse", () => {
  it("returns an empty array when no races exist", () => {
    expect(runsForHorse([], "h1")).toEqual([]);
  });

  it("extracts and normalizes runs for the specified horse, sorted by perMile ascending", () => {
    const races = [
      {
        id: "r1",
        name: "Sprint Cup",
        day: 1,
        distance: 1200,
        surface: "Turf" as const,
        result: [
          { horseId: "h1", time: 72, position: 1 },
          { horseId: "h2", time: 75, position: 2 },
        ],
      },
      {
        id: "r2",
        name: "Classic Mile",
        day: 10,
        distance: 1600,
        surface: "Turf" as const,
        result: [{ horseId: "h1", time: 90, position: 1 }],
      },
    ] as any;

    const runs = runsForHorse(races, "h1");
    expect(runs).toHaveLength(2);
    // 1600m in 90s is 90 / (1600 / 1609.344) ≈ 90.52 s/mi
    // 1200m in 72s is 72 / (1200 / 1609.344) ≈ 96.56 s/mi
    // Ascending order means 1600m run (faster per-mile) is first
    expect(runs[0].raceName).toBe("Classic Mile");
    expect(runs[0].perMile).toBeLessThan(runs[1].perMile);
    expect(runs[1].raceName).toBe("Sprint Cup");
  });
});

describe("computeHorseBenchmarkStanding", () => {
  it("returns baseline empty standing when horse has no runs", () => {
    const standing = computeHorseBenchmarkStanding([]);
    expect(standing.totalBenchmarks).toBe(15);
    expect(standing.outpacedCount).toBe(0);
    expect(standing.trailingCount).toBe(0);
    expect(standing.tiedCount).toBe(0);
    expect(standing.rank).toBe(16);
    expect(standing.fieldSize).toBe(16);
    expect(standing.percentile).toBe(0);
    expect(standing.averageDeltaPct).toBe(0);
    expect(standing.tier.label).toBe("Developing");
    expect(standing.rows).toHaveLength(0);
  });

  it("evaluates a dominant horse that outpaces all 15 real-world benchmarks", () => {
    // Ultra-fast 1200m turf run: 50s for 1200m (~67 s/mi) outpaces every benchmark
    const runs = [
      {
        seconds: 50,
        perMile: 67,
        distance: 1200,
        surface: "Turf" as const,
        raceName: "Super Sprint",
      },
      {
        seconds: 60,
        perMile: 70,
        distance: 1600,
        surface: "Dirt" as const,
        raceName: "Super Dirt Mile",
      },
    ];

    const standing = computeHorseBenchmarkStanding(runs);
    expect(standing.totalBenchmarks).toBe(15);
    expect(standing.outpacedCount).toBe(15);
    expect(standing.trailingCount).toBe(0);
    expect(standing.rank).toBe(1);
    expect(standing.fieldSize).toBe(16);
    expect(standing.percentile).toBe(100);
    expect(standing.topPercentile).toBeLessThanOrEqual(7);
    expect(standing.tier.label).toBe("Legendary Pace");
    expect(standing.averageDeltaPct).toBeGreaterThan(0);
    expect(standing.rows).toHaveLength(15);
    expect(standing.surfaceBreakdown.Turf.outpaced).toBe(9);
    expect(standing.surfaceBreakdown.Turf.total).toBe(9);
    expect(standing.surfaceBreakdown.Dirt.outpaced).toBe(6);
    expect(standing.surfaceBreakdown.Dirt.total).toBe(6);
  });

  it("evaluates an underperforming horse that trails all 15 real-world benchmarks", () => {
    // Very slow run: 250s per mile
    const runs = [
      {
        seconds: 250,
        perMile: 250,
        distance: 1600,
        surface: "Turf" as const,
        raceName: "Slow Jog",
      },
    ];

    const standing = computeHorseBenchmarkStanding(runs);
    expect(standing.totalBenchmarks).toBe(15);
    expect(standing.outpacedCount).toBe(0);
    expect(standing.trailingCount).toBe(15);
    expect(standing.rank).toBe(16);
    expect(standing.percentile).toBe(0);
    expect(standing.tier.label).toBe("Developing");
    expect(standing.averageDeltaPct).toBeLessThan(0);
  });

  it("assigns matchup ranks 1 to 15 ordered by delta percentage descending", () => {
    const runs = [
      {
        seconds: 95,
        perMile: 95,
        distance: 1600,
        surface: "Turf" as const,
        raceName: "Average Run",
      },
    ];

    const standing = computeHorseBenchmarkStanding(runs);
    expect(standing.rows).toHaveLength(15);

    // Check that rows are ordered with rank from 1 to 15
    const ranks = standing.rows.map((r) => r.rank);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    // Check that deltas are strictly descending (or equal)
    for (let i = 0; i < standing.rows.length - 1; i++) {
      expect(standing.rows[i].deltaPct!).toBeGreaterThanOrEqual(standing.rows[i + 1].deltaPct!);
    }
  });

  it("accurately distinguishes exact distance/surface matches from career best fallback", () => {
    // Horse only ran 1200m Turf
    const runs = [
      {
        seconds: 70,
        perMile: 93.88,
        distance: 1200,
        surface: "Turf" as const,
        raceName: "Sprint",
      },
    ];

    const standing = computeHorseBenchmarkStanding(runs);
    // Black Caviar is 1200m Turf -> exact match
    const blackCaviar = standing.rows.find((r) => r.benchmark.id === "rw-black-caviar");
    expect(blackCaviar?.exact).toBe(true);

    // Secretariat Belmont is 2414m Dirt -> fallback match
    const secretariat = standing.rows.find((r) => r.benchmark.id === "rw-secretariat-belmont");
    expect(secretariat?.exact).toBe(false);
  });

  it("handles exact pace ties and weights them in percentile calculations", () => {
    // Custom benchmark with known pace
    const customBenchmark: RealWorldRecord = {
      id: "rw-test",
      source: "curated",
      horse: "Legend",
      track: "Test Track",
      country: "USA",
      race: "Test Cup",
      surface: "Turf" as const,
      distanceMeters: 1600,
      seconds: 96,
      year: 2020,
      note: "Test record",
    };

    const runs = [
      {
        seconds: 96,
        perMile: 96 / (1600 / 1609.344),
        distance: 1600,
        surface: "Turf" as const,
        raceName: "Tied Race",
      },
    ];

    const standing = computeHorseBenchmarkStanding(runs, [customBenchmark]);
    expect(standing.totalBenchmarks).toBe(1);
    expect(standing.tiedCount).toBe(1);
    expect(standing.outpacedCount).toBe(0);
    // 0 + 1 * 0.5 = 0.5 / 1 * 100 = 50th percentile
    expect(standing.percentile).toBe(50);
  });
});

describe("compareToRealWorld with exact track matching", () => {
  const benchmarkChurchill: RealWorldRecord = {
    id: "rw-churchill-derby",
    horse: "Secretariat",
    track: "Churchill Downs",
    country: "USA",
    race: "Kentucky Derby",
    surface: "Dirt",
    distanceMeters: 2012,
    seconds: 119.4,
    year: 1973,
    note: "Derby record",
    source: "track_record",
  };

  it("sets isExactTrackMatch to true when in-game record is at the matching track", () => {
    const records = [
      mkRecord({
        trackId: "cd-1",
        trackName: "Churchill Downs",
        horseId: "h-cd",
        horseName: "Churchill Champ",
        surface: "Dirt",
        distance: 2012,
        time: 119.0,
      }),
      mkRecord({
        trackId: "bp-1",
        trackName: "Belmont Park",
        horseId: "h-bp",
        horseName: "Belmont Beast",
        surface: "Dirt",
        distance: 2012,
        time: 117.0, // faster time, but at different track
      }),
    ];

    const comparisons = compareToRealWorld(records, 120, [benchmarkChurchill]);
    expect(comparisons).toHaveLength(1);
    const comp = comparisons[0];
    expect(comp.gameRecord).toBeDefined();
    expect(comp.gameRecord?.trackName).toBe("Churchill Downs");
    expect(comp.gameRecord?.horseName).toBe("Churchill Champ");
    expect(comp.isExactTrackMatch).toBe(true);
    expect(comp.speedDeltaPct).toBeGreaterThan(0);
  });

  it("sets isExactTrackMatch to false and falls back when no record exists at the benchmark track", () => {
    const records = [
      mkRecord({
        trackId: "bp-1",
        trackName: "Belmont Park",
        horseId: "h-bp",
        horseName: "Belmont Beast",
        surface: "Dirt",
        distance: 2012,
        time: 120.0,
      }),
    ];

    const comparisons = compareToRealWorld(records, 120, [benchmarkChurchill]);
    expect(comparisons).toHaveLength(1);
    const comp = comparisons[0];
    expect(comp.gameRecord).toBeDefined();
    expect(comp.gameRecord?.trackName).toBe("Belmont Park");
    expect(comp.isExactTrackMatch).toBe(false);
  });
});

describe("getTripCategory", () => {
  it("categorizes distances into sprint, mile, route, and staying", () => {
    expect(getTripCategory(1000)).toBe("sprint");
    expect(getTripCategory(1200)).toBe("sprint");
    expect(getTripCategory(1308)).toBe("sprint");
    expect(getTripCategory(1400)).toBe("mile");
    expect(getTripCategory(1600)).toBe("mile");
    expect(getTripCategory(1710)).toBe("mile");
    expect(getTripCategory(1800)).toBe("route");
    expect(getTripCategory(2000)).toBe("route");
    expect(getTripCategory(2200)).toBe("route");
    expect(getTripCategory(2400)).toBe("staying");
    expect(getTripCategory(3200)).toBe("staying");
  });
});

describe("getRealWorldRecords", () => {
  it("filters records by source or returns all", () => {
    const all = getRealWorldRecords("all");
    const curated = getRealWorldRecords("curated");
    const trackRecords = getRealWorldRecords("track_record");

    expect(curated.length).toBeGreaterThan(0);
    expect(curated.every((r) => r.source === "curated")).toBe(true);
    expect(trackRecords.length).toBeGreaterThan(0);
    expect(trackRecords.every((r) => r.source === "track_record")).toBe(true);
    expect(all.length).toBe(curated.length + trackRecords.length);
  });
});

