/**
 * regionalTrends.ts - Regional earnings / Grade-1 trend aggregation + drilldowns.
 *
 * Pure: takes horses, races and the current day, returns per-region weekly
 * series plus the underlying jockeys / trainers / stables so the dashboard
 * widget can drill from a bar into the people behind it.
 */
import { REGION_LIST, type RegionId } from "@/core/calendar/regions";
import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import { isInWindow, weekBucket, type TimeWindowWeeks } from "./timeWindow";

export type RegionKey = RegionId | "other";

let trackRegionIndex: Map<string, RegionId> | null = null;

function normalizeTrack(name: string): string {
  return name.trim().toLowerCase();
}

function getTrackRegionIndex(): Map<string, RegionId> {
  if (trackRegionIndex) return trackRegionIndex;
  const idx = new Map<string, RegionId>();
  for (const region of REGION_LIST) {
    for (const track of region.tracks) {
      idx.set(normalizeTrack(track), region.id);
    }
  }
  trackRegionIndex = idx;
  return idx;
}

export function regionKeyForTrack(track?: string): RegionKey {
  if (!track) return "other";
  return getTrackRegionIndex().get(normalizeTrack(track)) ?? "other";
}

export function regionNameFor(key: RegionKey): string {
  if (key === "other") return "Other circuits";
  return REGION_LIST.find((r) => r.id === key)?.name ?? key;
}

export function regionKeyForRace(race?: Race): RegionKey {
  if (!race) return "other";
  const track = race.graded?.track ?? race.graded_override?.track;
  return regionKeyForTrack(track);
}

export interface RegionRunRow {
  horseId: string;
  horseName: string;
  entry: HorseRaceHistoryEntry;
  region: RegionKey;
  isG1: boolean;
}

export interface RegionTrendRow {
  region: RegionKey;
  name: string;
  earnings: number;
  starts: number;
  wins: number;
  g1Top3: number;
  /** Earnings per week bucket, oldest first. */
  weeklyEarnings: number[];
  /** Grade-1 top-3 finishes per week bucket, oldest first. */
  weeklyG1Top3: number[];
}

interface ComputeArgs {
  horses: Horse[];
  races: Race[];
  currentDay: number;
  weeks: TimeWindowWeeks;
  /** Restrict to a single stable (defaults to all horses passed in). */
  stableId?: string;
  /** Only count horses the player owns. */
  ownedOnly?: boolean;
  /** Surface filter: capitalized values "Turf" | "Dirt" | "Synthetic". Empty/omitted = all. */
  surface?: string[];
  /** Distance min in meters (inclusive). */
  distMin?: number;
  /** Distance max in meters (inclusive). */
  distMax?: number;
}

/** Flattens every in-window run into a region-tagged row. */
export function collectRegionRuns({
  horses,
  races,
  currentDay,
  weeks,
  stableId,
  ownedOnly,
  surface,
  distMin,
  distMax,
}: ComputeArgs): RegionRunRow[] {
  const raceById = new Map(races.map((r) => [r.id, r]));
  const rows: RegionRunRow[] = [];

  for (const horse of horses) {
    if (ownedOnly && !horse.owned) continue;
    for (const entry of horse.raceHistory ?? []) {
      if (!isInWindow(entry.day, currentDay, weeks)) continue;
      if (stableId && (entry.stableId ?? horse.stableId) !== stableId) continue;
      if (surface?.length && !surface.includes(entry.surface ?? "")) continue;
      if (distMin != null && (entry.distance ?? 0) < distMin) continue;
      if (distMax != null && (entry.distance ?? 0) > distMax) continue;
      const race = raceById.get(entry.raceId);
      const region = regionKeyForRace(race);
      const grade = entry.grade ?? race?.graded?.grade;
      rows.push({
        horseId: horse.id,
        horseName: horse.name,
        entry,
        region,
        isG1: grade === "G1",
      });
    }
  }
  return rows;
}

export function computeRegionTrends(args: ComputeArgs): RegionTrendRow[] {
  const buckets = args.weeks || 1;
  const byRegion = new Map<RegionKey, RegionTrendRow>();

  for (const run of collectRegionRuns(args)) {
    let row = byRegion.get(run.region);
    if (!row) {
      row = {
        region: run.region,
        name: regionNameFor(run.region),
        earnings: 0,
        starts: 0,
        wins: 0,
        g1Top3: 0,
        weeklyEarnings: new Array<number>(buckets).fill(0),
        weeklyG1Top3: new Array<number>(buckets).fill(0),
      };
      byRegion.set(run.region, row);
    }
    const earned = run.entry.purseEarned ?? 0;
    row.earnings += earned;
    row.starts += 1;
    if (run.entry.position === 1) row.wins += 1;
    const top3 = run.entry.position <= 3;
    if (run.isG1 && top3) row.g1Top3 += 1;

    const b = args.weeks ? weekBucket(run.entry.day, args.currentDay, args.weeks) : 0;
    if (b >= 0) {
      row.weeklyEarnings[b] += earned;
      if (run.isG1 && top3) row.weeklyG1Top3[b] += 1;
    }
  }

  return Array.from(byRegion.values()).sort((a, b) => b.earnings - a.earnings);
}

export interface DrilldownEntity {
  id: string;
  name: string;
  starts: number;
  wins: number;
  top3: number;
  earnings: number;
  g1Top3: number;
  g1Starts: number;
}

export interface RegionDrilldown {
  jockeys: DrilldownEntity[];
  trainers: DrilldownEntity[];
  stables: DrilldownEntity[];
  runs: RegionRunRow[];
}

interface DrilldownArgs extends ComputeArgs {
  region: RegionKey;
  /** id -> display name lookups. */
  jockeyNames: Map<string, string>;
  stableNames: Map<string, string>;
  /** stableId -> { id, name } of that stable's trainer. */
  trainerByStable: Map<string, { id: string; name: string }>;
}

export function computeRegionDrilldown(args: DrilldownArgs): RegionDrilldown {
  const runs = collectRegionRuns(args).filter((r) => r.region === args.region);

  const acc = (
    map: Map<string, DrilldownEntity>,
    id: string,
    name: string,
    run: RegionRunRow,
  ): void => {
    const e =
      map.get(id) ??
      ({ id, name, starts: 0, wins: 0, top3: 0, earnings: 0, g1Top3: 0, g1Starts: 0 } as DrilldownEntity);
    e.starts += 1;
    if (run.entry.position === 1) e.wins += 1;
    if (run.entry.position <= 3) e.top3 += 1;
    e.earnings += run.entry.purseEarned ?? 0;
    if (run.isG1) e.g1Starts += 1;
    if (run.isG1 && run.entry.position <= 3) e.g1Top3 += 1;
    map.set(id, e);
  };

  const jockeys = new Map<string, DrilldownEntity>();
  const trainers = new Map<string, DrilldownEntity>();
  const stables = new Map<string, DrilldownEntity>();

  for (const run of runs) {
    const jockeyId = run.entry.jockeyId;
    if (jockeyId) {
      acc(jockeys, jockeyId, args.jockeyNames.get(jockeyId) ?? "Unknown rider", run);
    }
    const stableId = run.entry.stableId;
    if (stableId) {
      acc(stables, stableId, args.stableNames.get(stableId) ?? "Unknown stable", run);
      const trainer = args.trainerByStable.get(stableId);
      if (trainer) acc(trainers, trainer.id, trainer.name, run);
    }
  }

  const sorted = (m: Map<string, DrilldownEntity>) =>
    Array.from(m.values()).sort((a, b) => b.earnings - a.earnings || b.starts - a.starts);

  return {
    jockeys: sorted(jockeys),
    trainers: sorted(trainers),
    stables: sorted(stables),
    runs: runs.sort((a, b) => b.entry.day - a.entry.day),
  };
}
