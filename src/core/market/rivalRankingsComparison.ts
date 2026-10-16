/**
 * rivalRankingsComparison.ts - Same-day rankings comparison for rival horses.
 *
 * Given a set of rival horses and a baseline — either the player's stable
 * (compares each rival's *owning stable* to the player's stable) or one
 * specific player horse (horse-to-horse) — returns each rival's rank,
 * points and price for that exact day plus the gap to the baseline.
 * Compares exact-day snapshots only; never borrows values from another day.
 *
 * Dependencies: @/core/horse/types, @/core/horse/ownership, ./rankingsHistory
 * Related files: src/core/stable/stableRankings.ts (stable snapshots),
 *   src/components/stable/RivalCareerCompareTable.tsx (UI consumer),
 *   src/routes/npc-stables.rival-careers.tsx (consumer)
 */

import type { Horse } from "@/core/horse/types";
import { getStableId, PLAYER_OWNER_ID } from "@/core/horse/ownership";
import type { RankingsHistory } from "./rankingsHistory";
import type { StableRankingsHistory } from "@/core/stable/stableRankings";

/** What "mine" means in a rival comparison. */
export type RankingsBaseline = { type: "stable" } | { type: "horse"; horseId: string };

/** The three metrics compared, in whichever granularity the baseline uses. */
export interface RankingsTriple {
  rank: number | null;
  points: number;
  price: number;
}

export interface RivalRankingsColumn {
  rivalId: string;
  /** The rival's values — its horse snapshot, or its stable's snapshot when the baseline is the stable. */
  values: RankingsTriple | null;
  /** Baseline values for the same day (shared across columns). */
  baseline: RankingsTriple | null;
  /** values − baseline; rank gap null when either side is unranked. */
  gap: { rank: number | null; points: number; price: number } | null;
}

type SnapshotLike = { day: number; rank: number | null; points: number; price: number };

const at = <T extends { day: number }>(entries: T[] | undefined, day: number): T | undefined =>
  entries?.find((e) => e.day === day);

const pick = (snap: SnapshotLike | undefined): RankingsTriple | null =>
  snap ? { rank: snap.rank, points: snap.points, price: snap.price } : null;

/**
 * Per-rival rank/points/price comparison against a chosen baseline for one
 * exact day. Columns follow the input `rivalIds` order.
 * @param args
 * @param args.rivalIds
 * @param args.horses
 * @param args.rankingsHistory
 * @param args.stableRankingsHistory
 * @param args.day
 * @param args.baseline
 */
export function rivalRankingsForDay(args: {
  rivalIds: string[];
  horses: Record<string, Horse>;
  rankingsHistory?: RankingsHistory;
  stableRankingsHistory?: StableRankingsHistory;
  day: number;
  baseline: RankingsBaseline;
}): RivalRankingsColumn[] {
  const { rivalIds, horses, rankingsHistory, stableRankingsHistory, day, baseline } = args;

  const baselineValues =
    baseline.type === "stable"
      ? pick(at(stableRankingsHistory?.[PLAYER_OWNER_ID], day))
      : pick(at(rankingsHistory?.[baseline.horseId], day));

  return rivalIds.map((rivalId) => {
    const horse = horses[rivalId];
    const stableKey = horse ? (getStableId(horse) ?? undefined) : undefined;
    const values =
      baseline.type === "stable"
        ? pick(at(stableKey ? stableRankingsHistory?.[stableKey] : undefined, day))
        : pick(at(rankingsHistory?.[rivalId], day));
    const gap =
      values && baselineValues
        ? {
            rank:
              values.rank !== null && baselineValues.rank !== null
                ? values.rank - baselineValues.rank
                : null,
            points: Math.round((values.points - baselineValues.points) * 10) / 10,
            price: values.price - baselineValues.price,
          }
        : null;
    return { rivalId, values, baseline: baselineValues, gap };
  });
}
