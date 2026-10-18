import type { Horse } from "@/domains/horse/simulation/types";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import type {
  RankingsHistory,
  RankingsSnapshot,
} from "@/domains/market/simulation/rankingsHistory";

export interface RankingsComparisonRow {
  horseId: string;
  name: string;
  snapshot: RankingsSnapshot | null;
  isPlayer: boolean;
  gap: { rank: number | null; points: number; reputation: number; price: number } | null;
}

/**
 * Compare exact-day snapshots only; never borrow values from another day.
 * @param history
 * @param horses
 * @param day
 * @param topCount
 */
export function compareRankingsForDay(
  history: RankingsHistory,
  horses: Horse[],
  day: number,
  topCount = 5,
) {
  const byId = new Map(horses.map((horse) => [horse.id, horse]));
  const snapshots = Object.entries(history).flatMap(([horseId, entries]) => {
    const snapshot = entries.find((entry) => entry.day === day);
    return snapshot ? [{ horseId, snapshot }] : [];
  });
  const ranked = snapshots
    .filter((row) => row.snapshot.rank !== null)
    .sort((a, b) => (a.snapshot.rank ?? Infinity) - (b.snapshot.rank ?? Infinity));
  const leader = ranked[0]?.snapshot;
  const rowFor = (horseId: string, snapshot: RankingsSnapshot | null): RankingsComparisonRow => ({
    horseId,
    name: byId.get(horseId)?.name ?? "Unknown horse",
    snapshot,
    isPlayer: isPlayerOwned(byId.get(horseId)),
    gap:
      snapshot && leader
        ? {
            rank:
              snapshot.rank === null || leader.rank === null ? null : snapshot.rank - leader.rank,
            points: snapshot.points - leader.points,
            reputation: snapshot.reputation - leader.reputation,
            price: snapshot.price - leader.price,
          }
        : null,
  });
  const leaders = ranked
    .slice(0, topCount)
    .map(({ horseId, snapshot }) => rowFor(horseId, snapshot));
  const players = horses
    .filter(isPlayerOwned)
    .map((horse) =>
      rowFor(horse.id, snapshots.find((row) => row.horseId === horse.id)?.snapshot ?? null),
    )
    .sort(
      (a, b) =>
        (a.snapshot?.rank ?? Infinity) - (b.snapshot?.rank ?? Infinity) ||
        a.name.localeCompare(b.name),
    );
  return { leaders, players };
}

export function rankingsComparisonDays(history: RankingsHistory): number[] {
  return [
    ...new Set(Object.values(history).flatMap((entries) => entries.map((entry) => entry.day))),
  ].sort((a, b) => b - a);
}
