/**
 * almanacInsights.ts - Derived Almanac analytics
 *
 * Pure derivations over stored track records and season (Grade 1) records:
 * per-track milestones, fastest horses by decade, a chronological track-history
 * timeline, and comparisons against the curated real-world benchmark dataset.
 *
 * Dependencies: ./historyTypes, @/data/realWorldRecords
 * Related files: src/routes/almanac.tsx, src/components/history/*
 */

import type { SeasonRecord, TrackRecord } from "./historyTypes";
import { REAL_WORLD_RECORDS, type RealWorldRecord } from "@/data/realWorldRecords";

/**
 * Metres per second for a record.
 *
 * @param r - Record with distance and time
 * @param r.distance - Distance in metres
 * @param r.time - Time in seconds
 */
export function recordSpeed(r: { distance: number; time: number }): number {
  return r.time > 0 ? r.distance / r.time : 0;
}

/**
 * Decade label for a game year, e.g. 1 -> "Years 1-10".
 *
 * @param year - Game year
 */
export function decadeOf(year: number): number {
  return Math.floor((Math.max(1, year) - 1) / 10);
}

export function decadeLabel(decade: number): string {
  return `Years ${decade * 10 + 1}-${decade * 10 + 10}`;
}

export type TrackMilestones = {
  trackId: string;
  trackName: string;
  /** Total records (all categories) standing at this track. */
  recordCount: number;
  /** Distinct surfaces with records. */
  surfaces: string[];
  /** Distinct distances with records. */
  distances: number[];
  /** Fastest record by average speed. */
  fastest?: TrackRecord;
  /** Most recently set record. */
  latest?: TrackRecord;
  /** Earliest record still standing. */
  earliest?: TrackRecord;
  /** Horses holding more than one record here. */
  multiRecordHolders: { horseId: string; horseName: string; count: number }[];
  /** Grade 1 races decided here (from season records). */
  g1Count: number;
};

/**
 * Build per-track milestone summaries.
 *
 * @param records - All standing track records
 * @param seasons - Grade 1 season results (used for G1 counts by race name match)
 */
export function buildTrackMilestones(
  records: TrackRecord[],
  seasons: SeasonRecord[] = [],
): TrackMilestones[] {
  const byTrack = new Map<string, TrackRecord[]>();
  for (const r of records) {
    const list = byTrack.get(r.trackId);
    if (list) list.push(r);
    else byTrack.set(r.trackId, [r]);
  }

  const out: TrackMilestones[] = [];
  for (const [trackId, list] of byTrack) {
    const trackName = list[0]?.trackName ?? trackId;
    const holders = tallyRecordHolders(list);
    let fastest: TrackRecord | undefined;
    let latest: TrackRecord | undefined;
    let earliest: TrackRecord | undefined;

    for (const r of list) {
      if (!fastest || recordSpeed(r) > recordSpeed(fastest)) fastest = r;
      if (!latest || r.day > latest.day) latest = r;
      if (!earliest || r.day < earliest.day) earliest = r;
    }

    const g1Count = seasons.filter(
      (s) => s.grade === "G1" && s.raceName.toLowerCase().includes(trackName.toLowerCase()),
    ).length;

    out.push({
      trackId,
      trackName,
      recordCount: list.length,
      surfaces: Array.from(new Set(list.map((r) => r.surface))).sort(),
      distances: Array.from(new Set(list.map((r) => r.distance))).sort((a, b) => a - b),
      fastest,
      latest,
      earliest,
      multiRecordHolders: Array.from(holders.values())
        .filter((h) => h.count > 1)
        .sort((a, b) => b.count - a.count),
      g1Count,
    });
  }

  return out.sort(
    (a, b) => b.recordCount - a.recordCount || a.trackName.localeCompare(b.trackName),
  );
}

export type DecadeLeader = {
  decade: number;
  label: string;
  recordCount: number;
  /** Fastest records of the decade by average speed, best first. */
  top: TrackRecord[];
  /** Horses with the most records set in the decade. */
  prolific: { horseId: string; horseName: string; count: number }[];
};

/**
 * Group records into decades and rank the fastest horses in each.
 *
 * @param records - All standing track records
 * @param topN - How many fastest records to keep per decade
 */
export function buildDecadeLeaders(records: TrackRecord[], topN = 5): DecadeLeader[] {
  const byDecade = new Map<number, TrackRecord[]>();
  for (const r of records) {
    const d = decadeOf(r.year);
    const list = byDecade.get(d);
    if (list) list.push(r);
    else byDecade.set(d, [r]);
  }

  return Array.from(byDecade.entries())
    .map(([decade, list]) => {
      const holders = tallyRecordHolders(list);
      return {
        decade,
        label: decadeLabel(decade),
        recordCount: list.length,
        top: [...list].sort((a, b) => recordSpeed(b) - recordSpeed(a)).slice(0, topN),
        prolific: Array.from(holders.values())
          .sort((a, b) => b.count - a.count || a.horseName.localeCompare(b.horseName))
          .slice(0, 3),
      };
    })
    .sort((a, b) => b.decade - a.decade);
}

/**
 * Tally how many records each horse holds. Shared by `buildTrackMilestones`
 * (multi-record holders) and `buildDecadeLeaders` (prolific holders).
 *
 * @param records - All standing track records
 */
function tallyRecordHolders(
  records: TrackRecord[],
): Map<string, { horseId: string; horseName: string; count: number }> {
  const holders = new Map<string, { horseId: string; horseName: string; count: number }>();
  for (const r of records) {
    const prev = holders.get(r.horseId);
    if (prev) prev.count += 1;
    else holders.set(r.horseId, { horseId: r.horseId, horseName: r.horseName, count: 1 });
  }
  return holders;
}

export type TimelineEvent = {
  id: string;
  day: number;
  year: number;
  kind: "record" | "g1";
  title: string;
  detail: string;
  trackName?: string;
};

/**
 * Chronological history of a track (or the whole world when trackId is omitted).
 *
 * @param records - Standing track records
 * @param seasons - Grade 1 season results
 * @param trackId - Optional track filter
 */
export function buildTrackTimeline(
  records: TrackRecord[],
  seasons: SeasonRecord[],
  trackId?: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const trackName = records.find((r) => r.trackId === trackId)?.trackName;

  for (const r of records) {
    if (trackId && r.trackId !== trackId) continue;
    events.push({
      id: `rec-${r.trackId}-${r.surface}-${r.distance}-${r.categoryKind ?? "overall"}-${r.categoryValue ?? ""}-${r.day}`,
      day: r.day,
      year: r.year,
      kind: "record",
      title: `${r.horseName} sets ${r.distance}m ${r.surface} record`,
      detail: `${r.trackName}${r.raceName ? ` · ${r.raceName}` : ""}`,
      trackName: r.trackName,
    });
  }

  for (const s of seasons) {
    if (trackId && !(trackName && s.raceName.toLowerCase().includes(trackName.toLowerCase())))
      continue;
    events.push({
      id: `g1-${s.id}`,
      day: s.day,
      year: s.year,
      kind: "g1",
      title: `${s.winnerName} wins the ${s.raceName}`,
      detail: `${s.grade} · ridden by ${s.jockeyName}`,
    });
  }

  return events.sort((a, b) => b.day - a.day);
}

export type BenchmarkComparison = {
  benchmark: RealWorldRecord;
  /** Closest in-game record at the same surface within the distance tolerance. */
  gameRecord?: TrackRecord;
  /** Positive means the in-game record is faster than the benchmark pace. */
  speedDeltaPct?: number;
};

/**
 * Match curated real-world records against the closest in-game record.
 *
 * @param records - Standing track records
 * @param tolerance - Allowed distance difference in metres (default 120)
 */
export function compareToRealWorld(records: TrackRecord[], tolerance = 120): BenchmarkComparison[] {
  return REAL_WORLD_RECORDS.map((benchmark) => {
    const candidates = records.filter(
      (r) =>
        (r.categoryKind ?? "overall") === "overall" &&
        r.surface === benchmark.surface &&
        Math.abs(r.distance - benchmark.distanceMeters) <= tolerance,
    );
    let best: TrackRecord | undefined;
    for (const c of candidates) {
      if (!best || recordSpeed(c) > recordSpeed(best)) best = c;
    }
    if (!best) return { benchmark };
    const benchmarkSpeed = benchmark.distanceMeters / benchmark.seconds;
    return {
      benchmark,
      gameRecord: best,
      speedDeltaPct: ((recordSpeed(best) - benchmarkSpeed) / benchmarkSpeed) * 100,
    };
  });
}
