/**
 * rankingsHistory.ts - Daily world-rankings snapshots per horse.
 *
 * Recorded by the daily snapshot pipeline phase: each day the world rankings
 * are recomputed and every ranked horse gets an entry with its position,
 * ranking points, reputation (fame) and current auction-house market value.
 * Pure: no state mutation.
 */

import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import type { Horse } from "@/domains/horse/simulation/types";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";
import { worldRankings } from "@/domains/market/simulation/raceForm";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";

/** Days of rankings history kept per horse. */
export const RANKINGS_HISTORY_MAX_ENTRIES = 120;
/** How many ranked horses are tracked each day. */
export const RANKINGS_HISTORY_TRACKED = 50;

export interface RankingsSnapshot {
  day: number;
  /** 1-based position in the world rankings that day. */
  rank: number | null;
  points: number;
  /** Horse fame at snapshot time. */
  reputation: number;
  /** Auction-house market value at snapshot time. */
  price: number;
}

export type RankingsHistory = Record<string, RankingsSnapshot[]>;

/**
 * Keep daily leaders and all player horses, including unranked horses.
 * Retain past snapshots when a horse leaves the rankings for daily comparisons.
 * @param history - Existing per-horse snapshot map
 * @param horses - All horses in game
 * @param day - Current game day
 */
export function recordRankingsHistory(
  history: RankingsHistory | undefined,
  horses: Horse[],
  day: number,
): RankingsHistory {
  const rows = worldRankings(horses, day, 365, RANKINGS_HISTORY_TRACKED);
  const byId = new Map(horses.map((h) => [h.id, h]));
  const next: RankingsHistory = {};
  for (const [id, entries] of Object.entries(history ?? {})) {
    const retained = entries.filter(
      (entry) => entry.day > day - RANKINGS_HISTORY_MAX_ENTRIES && entry.day !== day,
    );
    if (retained.length) next[id] = retained;
  }
  rows.forEach((row, i) => {
    const horse = byId.get(row.horseId);
    if (!horse) return;
    const prev = next[row.horseId] ?? [];
    const snapshot: RankingsSnapshot = {
      day,
      rank: i + 1,
      points: row.points,
      reputation: Math.round(horse.fame ?? 0),
      price: horseMarketValue(ensurePhenotypeResolved(horse), horses),
    };
    next[row.horseId] = [...prev, snapshot].slice(-RANKINGS_HISTORY_MAX_ENTRIES);
  });
  const rankedIds = new Set(rows.map((row) => row.horseId));
  const allRows = horses.some((h) => isPlayerOwned(h) && !rankedIds.has(h.id))
    ? worldRankings(horses, day, 365, horses.length)
    : [];
  for (const horse of horses) {
    if (!isPlayerOwned(horse) || horse.lifecycleStatus === "deceased" || rankedIds.has(horse.id))
      continue;
    // A player horse below the tracked top 50 still has its actual world rank.
    const index = allRows.findIndex((row) => row.horseId === horse.id);
    const row = allRows[index];
    next[horse.id] = [
      ...(next[horse.id] ?? []),
      {
        day,
        rank: index < 0 ? null : index + 1,
        points: row?.points ?? 0,
        reputation: Math.round(horse.fame ?? 0),
        price: horseMarketValue(ensurePhenotypeResolved(horse), horses),
      },
    ].slice(-RANKINGS_HISTORY_MAX_ENTRIES);
  }
  return next;
}
