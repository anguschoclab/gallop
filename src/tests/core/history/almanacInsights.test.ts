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
} from "@/core/history/almanacInsights";
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
