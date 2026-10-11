/**
 * rankingsHistory.ts - Daily world-rankings snapshots per horse.
 *
 * Recorded by the daily snapshot pipeline phase: each day the world rankings
 * are recomputed and every ranked horse gets an entry with its position,
 * ranking points, reputation (fame) and current auction-house market value.
 * Pure: no state mutation.
 */

import type { Horse } from "@/core/horse/types";
import { horseMarketValue } from "@/core/horse/pricing";
import { worldRankings } from "@/core/market/raceForm";

/** Days of rankings history kept per horse. */
export const RANKINGS_HISTORY_MAX_ENTRIES = 120;
/** How many ranked horses are tracked each day. */
export const RANKINGS_HISTORY_TRACKED = 50;

export interface RankingsSnapshot {
  day: number;
  /** 1-based position in the world rankings that day. */
  rank: number;
  points: number;
  /** Horse fame at snapshot time. */
  reputation: number;
  /** Auction-house market value at snapshot time. */
  price: number;
}

export type RankingsHistory = Record<string, RankingsSnapshot[]>;

/**
 * Append today's rankings snapshot for every tracked horse; drop horses that
 * fall out of the rankings (their history is retained while they remain
 * tracked, and pruned once they leave the tracked set for good).
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
  rows.forEach((row, i) => {
    const horse = byId.get(row.horseId);
    if (!horse) return;
    const prev = (history?.[row.horseId] ?? []).filter((s) => s.day !== day);
    const snapshot: RankingsSnapshot = {
      day,
      rank: i + 1,
      points: row.points,
      reputation: Math.round(horse.fame ?? 0),
      price: horseMarketValue(horse, horses),
    };
    next[row.horseId] = [...prev, snapshot].slice(-RANKINGS_HISTORY_MAX_ENTRIES);
  });
  return next;
}
