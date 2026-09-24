/**
 * trackLedger.ts - Persistent per-racecourse race ledger
 *
 * Resolved races are pruned from `state.races` after 30 days (365 for graded),
 * so a durable course-by-course history needs its own record. Each resolved
 * race appends one ledger entry holding the winner, the winning time and the
 * prestige each stable gained or lost from that running.
 *
 * Dependencies: @/constants (DAYS_PER_YEAR), @/core/data/tracksAccessor, @/core/prestige/racecoursePrestige
 * Related files: src/core/time/phases/raceResolution.ts (appends), src/routes/track-history.tsx (reads)
 */

import { DAYS_PER_YEAR } from "@/constants";
import type { Horse, Race } from "@/game/types";
import type { Stable } from "@/core/stable/types";
import { TRACK_BY_ID } from "@/core/data/tracksAccessor";
import { racecoursePrestigeMultiplier } from "@/core/prestige/racecoursePrestige";

/** Maximum ledger entries retained (oldest dropped first). */
export const TRACK_LEDGER_MAX_ENTRIES = 1500;

/** Synthetic ledger id for the player's own stable. */
export const PLAYER_LEDGER_STABLE_ID = "__player__";

type GradeKey = "G1" | "G2" | "G3" | "ungraded";

/** Prestige awarded to the winning stable, by grade. */
const PRESTIGE_WIN: Record<GradeKey, number> = { G1: 12, G2: 7, G3: 4, ungraded: 2 };
/** Prestige awarded for a placed finish (2nd/3rd), by grade. */
const PRESTIGE_PLACED: Record<GradeKey, number> = { G1: 5, G2: 3, G3: 2, ungraded: 1 };
/** Prestige lost when a graded runner finishes in the back half of the field. */
const PRESTIGE_GRADED_FLOP = -1;

export interface StablePrestigeDelta {
  stableId: string;
  stableName: string;
  delta: number;
  isPlayer: boolean;
}

export interface TrackLedgerEntry {
  raceId: string;
  trackId: string;
  trackName: string;
  raceName: string;
  day: number;
  year: number;
  grade?: "G1" | "G2" | "G3";
  raceClass?: string;
  surface?: "Turf" | "Dirt" | "Synthetic";
  distance: number;
  purse: number;
  fieldSize: number;
  winnerId: string;
  winnerName: string;
  winnerStableId?: string;
  winnerStableName?: string;
  winnerIsPlayer: boolean;
  /** Winning time in seconds. */
  time: number;
  runnerUpName?: string;
  /** Prestige movement per stable represented in the field, largest gain first. */
  prestigeDeltas: StablePrestigeDelta[];
}

export interface TrackLedgerFilters {
  fromDay?: number;
  toDay?: number;
  raceType?: string;
  stableId?: string;
}

export interface TrackLedgerStableOption {
  stableId: string;
  stableName: string;
  isPlayer: boolean;
}

function gradeKey(race: Race): GradeKey {
  return race.graded?.grade ?? "ungraded";
}

function yearOf(day: number): number {
  return Math.floor((day - 1) / DAYS_PER_YEAR) + 1;
}

/**
 * Prestige points a single finishing position is worth at this race.
 *
 * @param race - The race being scored
 * @param position - Finishing position (1-indexed)
 * @param fieldSize - Number of runners that completed the race
 */
export function positionPrestige(race: Race, position: number, fieldSize: number): number {
  const key = gradeKey(race);
  const venue = racecoursePrestigeMultiplier(race.trackId ?? race.graded?.trackId, race.graded?.track);
  if (position === 1) return Math.round(PRESTIGE_WIN[key] * venue);
  if (position <= 3) return Math.round(PRESTIGE_PLACED[key] * venue);
  if (race.graded && position > Math.ceil(fieldSize / 2)) return PRESTIGE_GRADED_FLOP;
  return 0;
}

/**
 * Build a ledger entry for a resolved race, or null when it cannot be attributed
 * to a racecourse or has no winner.
 *
 * @param race - Resolved race
 * @param result - Finishing order with times
 * @param horses - Horse lookup
 * @param stables - NPC stable lookup keyed by stable id
 * @param playerStableName - Display name for the player's stable
 * @param day - Day the race was resolved on
 */
export function buildTrackLedgerEntry(
  race: Race,
  result: Array<{ horseId: string; position: number; time: number }>,
  horses: Map<string, Horse>,
  stables: Map<string, Stable>,
  playerStableName: string,
  day: number,
): TrackLedgerEntry | null {
  const trackId = race.trackId ?? race.graded?.trackId;
  if (!trackId) return null;
  const winner = result.find((r) => r.position === 1);
  if (!winner) return null;

  const trackName = race.graded?.track ?? TRACK_BY_ID[trackId]?.name ?? "Unknown Course";
  const winnerHorse = horses.get(winner.horseId);
  const fieldSize = result.length || race.entries?.length || race.fieldSize;

  const totals = new Map<string, StablePrestigeDelta>();
  for (const finish of result) {
    const horse = horses.get(finish.horseId);
    const ownership = horse?.ownership;
    if (!ownership || ownership.type === "unowned") continue;

    const isPlayer = ownership.type === "player";
    const stableId = isPlayer ? PLAYER_LEDGER_STABLE_ID : ownership.stableId;
    const stableName = isPlayer
      ? playerStableName
      : (stables.get(ownership.stableId)?.name ?? "Unknown Stable");

    const delta = positionPrestige(race, finish.position, fieldSize);
    if (delta === 0 && !totals.has(stableId)) {
      totals.set(stableId, { stableId, stableName, delta: 0, isPlayer });
      continue;
    }
    const existing = totals.get(stableId);
    if (existing) existing.delta += delta;
    else totals.set(stableId, { stableId, stableName, delta, isPlayer });
  }

  const winnerOwnership = winnerHorse?.ownership;
  const winnerIsPlayer = winnerOwnership?.type === "player";
  const winnerStableId = winnerIsPlayer
    ? PLAYER_LEDGER_STABLE_ID
    : winnerOwnership?.type === "npc"
      ? winnerOwnership.stableId
      : undefined;

  const runnerUp = result.find((r) => r.position === 2);

  return {
    raceId: race.id,
    trackId,
    trackName,
    raceName: race.name,
    day,
    year: yearOf(day),
    grade: race.graded?.grade,
    raceClass: race.raceClass,
    surface: race.surface ?? race.graded?.surface,
    distance: race.distance,
    purse: race.purse,
    fieldSize,
    winnerId: winner.horseId,
    winnerName: winnerHorse?.name ?? "Unknown",
    winnerStableId,
    winnerStableName: winnerStableId
      ? winnerIsPlayer
        ? playerStableName
        : (stables.get(winnerStableId)?.name ?? "Unknown Stable")
      : undefined,
    winnerIsPlayer,
    time: winner.time,
    runnerUpName: runnerUp ? (horses.get(runnerUp.horseId)?.name ?? undefined) : undefined,
    prestigeDeltas: Array.from(totals.values()).sort((a, b) => b.delta - a.delta),
  };
}

/**
 * Append entries to the ledger, de-duplicating by raceId and capping length.
 *
 * @param ledger - Existing ledger (may be undefined)
 * @param entries - New entries to append
 */
export function appendTrackLedger(
  ledger: TrackLedgerEntry[] | undefined,
  entries: TrackLedgerEntry[],
): TrackLedgerEntry[] {
  if (entries.length === 0) return ledger ?? [];
  const seen = new Set((ledger ?? []).map((e) => e.raceId));
  const fresh = entries.filter((e) => !seen.has(e.raceId));
  if (fresh.length === 0) return ledger ?? [];
  const merged = [...(ledger ?? []), ...fresh];
  return merged.length > TRACK_LEDGER_MAX_ENTRIES
    ? merged.slice(merged.length - TRACK_LEDGER_MAX_ENTRIES)
    : merged;
}

export interface TrackLedgerSummary {
  trackId: string;
  trackName: string;
  country: string;
  raceCount: number;
  gradedCount: number;
  firstDay: number;
  lastDay: number;
  totalPurse: number;
  playerWins: number;
}

/**
 * Per-course summaries, busiest course first.
 *
 * @param ledger - Track ledger entries
 */
export function summarizeTrackLedger(ledger: TrackLedgerEntry[]): TrackLedgerSummary[] {
  const map = new Map<string, TrackLedgerSummary>();
  for (const entry of ledger) {
    let summary = map.get(entry.trackId);
    if (!summary) {
      summary = {
        trackId: entry.trackId,
        trackName: entry.trackName,
        country: TRACK_BY_ID[entry.trackId]?.country ?? "—",
        raceCount: 0,
        gradedCount: 0,
        firstDay: entry.day,
        lastDay: entry.day,
        totalPurse: 0,
        playerWins: 0,
      };
      map.set(entry.trackId, summary);
    }
    summary.raceCount += 1;
    if (entry.grade) summary.gradedCount += 1;
    summary.firstDay = Math.min(summary.firstDay, entry.day);
    summary.lastDay = Math.max(summary.lastDay, entry.day);
    summary.totalPurse += entry.purse;
    if (entry.winnerIsPlayer) summary.playerWins += 1;
  }
  return Array.from(map.values()).sort(
    (a, b) => b.raceCount - a.raceCount || a.trackName.localeCompare(b.trackName),
  );
}

/** Filter ledger rows by game-day range, race class and represented stable. */
export function filterTrackLedger(
  ledger: TrackLedgerEntry[],
  filters: TrackLedgerFilters,
): TrackLedgerEntry[] {
  const fromDay = Number.isFinite(filters.fromDay) ? filters.fromDay : undefined;
  const toDay = Number.isFinite(filters.toDay) ? filters.toDay : undefined;

  return ledger.filter((entry) => {
    if (fromDay !== undefined && entry.day < fromDay) return false;
    if (toDay !== undefined && entry.day > toDay) return false;
    if (filters.raceType && entry.raceClass !== filters.raceType) return false;
    if (
      filters.stableId &&
      !entry.prestigeDeltas.some((delta) => delta.stableId === filters.stableId)
    ) {
      return false;
    }
    return true;
  });
}

/** Stable choices represented in the supplied ledger, player first then alphabetical. */
export function trackLedgerStableOptions(ledger: TrackLedgerEntry[]): TrackLedgerStableOption[] {
  const options = new Map<string, TrackLedgerStableOption>();
  for (const entry of ledger) {
    for (const delta of entry.prestigeDeltas) {
      if (!options.has(delta.stableId)) {
        options.set(delta.stableId, {
          stableId: delta.stableId,
          stableName: delta.stableName,
          isPlayer: delta.isPlayer,
        });
      }
    }
  }
  return Array.from(options.values()).sort(
    (a, b) => Number(b.isPlayer) - Number(a.isPlayer) || a.stableName.localeCompare(b.stableName),
  );
}

/**
 * Aggregate prestige movement per stable at one course.
 *
 * @param ledger - Track ledger entries (already filtered to a course, or not)
 * @param trackId - Optional course filter
 */
export function stablePrestigeAtTrack(
  ledger: TrackLedgerEntry[],
  trackId?: string,
): Array<StablePrestigeDelta & { races: number; wins: number }> {
  const map = new Map<string, StablePrestigeDelta & { races: number; wins: number }>();
  for (const entry of ledger) {
    if (trackId && entry.trackId !== trackId) continue;
    for (const d of entry.prestigeDeltas) {
      const row = map.get(d.stableId);
      if (row) {
        row.delta += d.delta;
        row.races += 1;
        if (entry.winnerStableId === d.stableId) row.wins += 1;
      } else {
        map.set(d.stableId, {
          ...d,
          races: 1,
          wins: entry.winnerStableId === d.stableId ? 1 : 0,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.delta - a.delta || b.wins - a.wins);
}

/**
 * Races held at a course, most recent first.
 *
 * @param ledger - Track ledger entries
 * @param trackId - Course id
 */
export function racesAtTrack(ledger: TrackLedgerEntry[], trackId: string): TrackLedgerEntry[] {
  return ledger.filter((e) => e.trackId === trackId).sort((a, b) => b.day - a.day);
}
