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
import { pacePerMile } from "@/core/common/formatting";
import { iterateRaceRuns } from "@/core/race/bestPace";
import type { Race } from "@/core/race/types";

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

export type HorseBenchmarkRun = {
  seconds: number;
  perMile: number;
  distance: number;
  surface?: "Turf" | "Dirt" | "Synthetic";
  raceName: string;
};

export type BenchmarkMatchupRow = {
  benchmark: RealWorldRecord;
  benchmarkPerMile: number;
  match?: HorseBenchmarkRun;
  exact: boolean;
  deltaPct?: number;
  rank: number; // 1 to totalBenchmarks, sorted by deltaPct descending
  outpaced: boolean;
};

export type BenchmarkFieldStanding = {
  totalBenchmarks: number;
  outpacedCount: number;
  trailingCount: number;
  tiedCount: number;
  rank: number;
  fieldSize: number;
  percentile: number;
  topPercentile: number;
  averageDeltaPct: number;
  surfaceBreakdown: {
    Turf: { outpaced: number; total: number };
    Dirt: { outpaced: number; total: number };
    Synthetic: { outpaced: number; total: number };
  };
  tier: {
    label: string;
    variant: "gold" | "amber" | "emerald" | "slate" | "muted";
  };
  rows: BenchmarkMatchupRow[];
};

/**
 * Every resolved run this horse recorded, normalised to seconds per mile.
 *
 * @param races - All races to scan
 * @param horseId - Identifier of the horse to collect runs for
 * @returns Sorted array of normalized runs for this horse (fastest pace first)
 */
export function runsForHorse(races: Race[], horseId: string): HorseBenchmarkRun[] {
  return iterateRaceRuns(races)
    .filter((r) => r.horseId === horseId)
    .map((r) => ({
      seconds: r.seconds,
      perMile: r.perMile,
      distance: r.distance,
      surface: r.surface,
      raceName: r.raceName,
    }))
    .sort((a, b) => a.perMile - b.perMile);
}

/**
 * Computes an at-a-glance standing and ranking of a horse's recorded race times
 * against the curated real-world benchmark field.
 *
 * @param runs - Sorted list of resolved runs recorded by this horse
 * @param benchmarks - Reference benchmark dataset (defaults to REAL_WORLD_RECORDS)
 * @returns BenchmarkFieldStanding object containing field rank, percentile, and matchup rows
 */
export function computeHorseBenchmarkStanding(
  runs: HorseBenchmarkRun[],
  benchmarks: RealWorldRecord[] = REAL_WORLD_RECORDS,
): BenchmarkFieldStanding {
  const totalBenchmarks = benchmarks.length;
  const fieldSize = totalBenchmarks + 1;

  const surfaceTotals = {
    Turf: benchmarks.filter((b) => b.surface === "Turf").length,
    Dirt: benchmarks.filter((b) => b.surface === "Dirt").length,
    Synthetic: benchmarks.filter((b) => b.surface === "Synthetic").length,
  };

  if (runs.length === 0) {
    return {
      totalBenchmarks,
      outpacedCount: 0,
      trailingCount: 0,
      tiedCount: 0,
      rank: fieldSize,
      fieldSize,
      percentile: 0,
      topPercentile: 100,
      averageDeltaPct: 0,
      surfaceBreakdown: {
        Turf: { outpaced: 0, total: surfaceTotals.Turf },
        Dirt: { outpaced: 0, total: surfaceTotals.Dirt },
        Synthetic: { outpaced: 0, total: surfaceTotals.Synthetic },
      },
      tier: { label: "Developing", variant: "muted" },
      rows: [],
    };
  }

  const best = runs[0];
  const rawRows = benchmarks.map((benchmark) => {
    const benchmarkPerMile = pacePerMile(benchmark.seconds, benchmark.distanceMeters);
    const comparable = runs.filter(
      (r) =>
        (!r.surface || r.surface === benchmark.surface) &&
        Math.abs(r.distance - benchmark.distanceMeters) <= 400,
    );
    const match = comparable[0] ?? best;
    const exact = comparable.length > 0;
    const rawDelta =
      match && benchmarkPerMile > 0
        ? ((benchmarkPerMile - match.perMile) / benchmarkPerMile) * 100
        : undefined;
    const deltaPct = rawDelta !== undefined && Math.abs(rawDelta) < 1e-6 ? 0 : rawDelta;
    const outpaced = deltaPct !== undefined && deltaPct > 0;
    return {
      benchmark,
      benchmarkPerMile,
      match,
      exact,
      deltaPct,
      outpaced,
    };
  });

  // Sort rows by deltaPct descending to assign matchup rank 1 to totalBenchmarks
  const sortedRows = [...rawRows].sort((a, b) => {
    const da = a.deltaPct ?? -Infinity;
    const db = b.deltaPct ?? -Infinity;
    return db - da;
  });

  const rows: BenchmarkMatchupRow[] = sortedRows.map((r, idx) => ({
    ...r,
    rank: idx + 1,
  }));

  let outpacedCount = 0;
  let trailingCount = 0;
  let tiedCount = 0;
  let sumDelta = 0;

  const surfaceBreakdown = {
    Turf: { outpaced: 0, total: 0 },
    Dirt: { outpaced: 0, total: 0 },
    Synthetic: { outpaced: 0, total: 0 },
  };

  for (const r of rows) {
    const surf = r.benchmark.surface as "Turf" | "Dirt" | "Synthetic";
    if (surfaceBreakdown[surf]) {
      surfaceBreakdown[surf].total += 1;
    }
    if (r.deltaPct !== undefined) {
      sumDelta += r.deltaPct;
      if (r.deltaPct > 0) {
        outpacedCount += 1;
        if (surfaceBreakdown[surf]) surfaceBreakdown[surf].outpaced += 1;
      } else if (r.deltaPct < 0) {
        trailingCount += 1;
      } else {
        tiedCount += 1;
      }
    }
  }

  const rank = Math.max(1, Math.min(fieldSize, totalBenchmarks - outpacedCount + 1));
  const percentile =
    totalBenchmarks > 0
      ? Math.round(((outpacedCount + tiedCount * 0.5) / totalBenchmarks) * 100)
      : 0;
  const topPercentile = Math.max(1, Math.round((rank / fieldSize) * 100));
  const averageDeltaPct = totalBenchmarks > 0 ? sumDelta / totalBenchmarks : 0;

  let tier: { label: string; variant: "gold" | "amber" | "emerald" | "slate" | "muted" };
  if (percentile >= 90) {
    tier = { label: "Legendary Pace", variant: "gold" };
  } else if (percentile >= 75) {
    tier = { label: "World Class", variant: "amber" };
  } else if (percentile >= 50) {
    tier = { label: "Stakes Quality", variant: "emerald" };
  } else if (percentile >= 25) {
    tier = { label: "Competitive", variant: "slate" };
  } else {
    tier = { label: "Developing", variant: "muted" };
  }

  return {
    totalBenchmarks,
    outpacedCount,
    trailingCount,
    tiedCount,
    rank,
    fieldSize,
    percentile,
    topPercentile,
    averageDeltaPct,
    surfaceBreakdown,
    tier,
    rows,
  };
}
