/**
 * stableRankings.ts - Daily stable rankings snapshots.
 *
 * Recorded by the daily snapshot pipeline phase: each day every NPC stable
 * plus the player's stable gets a snapshot with its position, roster ranking
 * points, results earned while campaigned by the stable, windowed prize
 * money, reputation (normalized to a 0-100 scale) and the market value of
 * its current roster. Pure: no state mutation.
 *
 * Dependencies: @/core/horse/types, @/core/horse/pricing, @/core/market/raceForm,
 *   @/core/horse/ownership, @/core/standings/computeStandings, ./types
 * Related files: src/core/market/rankingsHistory.ts (per-horse equivalent),
 *   src/core/time/phases/dailySnapshotPhase.ts (recorder),
 *   src/routes/stableRankings.tsx (UI)
 */

import type { Horse } from "@/core/horse/types";
import type { Stable, PlayerProfile } from "./types";
import { horseMarketValue } from "@/core/horse/pricing";
import { worldRankings, resultPoints, decay } from "@/core/market/raceForm";
import { isPlayerOwned, ownerKey, PLAYER_OWNER_ID } from "@/core/horse/ownership";
import { computeFallbackPurse } from "@/core/standings/computeStandings";

/** Days of rankings history kept per stable. */
export const STABLE_RANKINGS_MAX_ENTRIES = 120;
/** Ranking window matching the per-horse world rankings. */
export const STABLE_RANKINGS_WINDOW_DAYS = 365;

export interface StableRankingsSnapshot {
  day: number;
  /** 1-based position among stables that day; null when no recorded activity. */
  rank: number | null;
  /** Sum of the current roster horses' decayed ranking points. */
  points: number;
  /** Decayed result points for results earned while campaigned by this stable. */
  earnedPoints: number;
  /** Prize money earned while campaigned by this stable, within the window. */
  earnings: number;
  /** Reputation on a 0-100 scale (player score is normalized down from 0-1000). */
  reputation: number;
  /** Sum of the current roster's auction-house market value. */
  price: number;
}

export type StableRankingsHistory = Record<string, StableRankingsSnapshot[]>;

export interface StableRankingRow extends Omit<StableRankingsSnapshot, "day"> {
  stableId: string;
  name: string;
  isPlayer: boolean;
  silkColor?: string;
}

export interface StableRankingsInput {
  horses: Horse[];
  npcStables: Stable[];
  playerReputationScore: number;
  playerProfile?: PlayerProfile;
  day: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Current-day stable rankings: one row per NPC stable plus the player's
 * stable, sorted by roster points then earned points then earnings then id.
 * @param input
 */
export function computeStableRankings(input: StableRankingsInput): StableRankingRow[] {
  const { horses, npcStables, playerReputationScore, playerProfile, day } = input;
  const byId = new Map(horses.map((h) => [h.id as string, h]));

  // Roster ranking points: sum of each owner's ranked horses (uncapped list).
  const pointsByOwner = new Map<string, number>();
  for (const row of worldRankings(horses, day, STABLE_RANKINGS_WINDOW_DAYS, horses.length)) {
    const owner = ownerKey(byId.get(row.horseId));
    if (!owner) continue;
    pointsByOwner.set(owner, (pointsByOwner.get(owner) ?? 0) + row.points);
  }

  // Earned points + earnings: attributed to the stable that campaigned the
  // horse at race time (entry.stableId); player-owned results with no
  // stableId fall back to the player bucket.
  const earnedPointsByOwner = new Map<string, number>();
  const earningsByOwner = new Map<string, number>();
  for (const h of horses) {
    const playerKey = isPlayerOwned(h) ? PLAYER_OWNER_ID : null;
    for (const e of h.raceHistory ?? []) {
      if (e.day > day || day - e.day > STABLE_RANKINGS_WINDOW_DAYS) continue;
      const key = e.stableId || playerKey;
      if (!key) continue;
      earnedPointsByOwner.set(
        key,
        (earnedPointsByOwner.get(key) ?? 0) + resultPoints(e) * decay(e.day, day),
      );
      earningsByOwner.set(
        key,
        (earningsByOwner.get(key) ?? 0) + (e.purseEarned ?? computeFallbackPurse(e)),
      );
    }
  }

  // Roster market value: current owners only.
  const priceByOwner = new Map<string, number>();
  for (const h of horses) {
    if (h.lifecycleStatus === "deceased") continue;
    const key = ownerKey(h);
    if (!key) continue;
    priceByOwner.set(key, (priceByOwner.get(key) ?? 0) + horseMarketValue(h, horses));
  }

  const metricsFor = (key: string) => ({
    points: round1(pointsByOwner.get(key) ?? 0),
    earnedPoints: round1(earnedPointsByOwner.get(key) ?? 0),
    earnings: Math.round(earningsByOwner.get(key) ?? 0),
    price: priceByOwner.get(key) ?? 0,
  });

  const rows: StableRankingRow[] = [
    {
      stableId: PLAYER_OWNER_ID,
      name: playerProfile?.stableName ?? "Your stable",
      isPlayer: true,
      silkColor: playerProfile?.silk?.primary,
      reputation: Math.round(playerReputationScore / 10),
      rank: null,
      ...metricsFor(PLAYER_OWNER_ID),
    },
    ...npcStables.map((s) => ({
      stableId: s.id as string,
      name: s.name,
      isPlayer: false,
      silkColor: s.colors?.primary,
      reputation: Math.round(s.reputation),
      rank: null as number | null,
      ...metricsFor(s.id as string),
    })),
  ];

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.earnedPoints - a.earnedPoints ||
      b.earnings - a.earnings ||
      a.stableId.localeCompare(b.stableId),
  );
  rows.forEach((row, i) => {
    row.rank = row.points > 0 || row.earnedPoints > 0 || row.earnings > 0 ? i + 1 : null;
  });
  return rows;
}

/**
 * Append today's snapshot for every live stable plus the player. Entries for
 * stables that no longer exist (e.g. dissolved via bankruptcy) are pruned;
 * the player key is always retained, even with no recorded activity.
 * @param history - Existing per-stable snapshot map
 * @param input - Stable rankings input including the current game day
 */
export function recordStableRankingsHistory(
  history: StableRankingsHistory | undefined,
  input: StableRankingsInput,
): StableRankingsHistory {
  const rows = computeStableRankings(input);
  const live = new Set(rows.map((r) => r.stableId));
  const next: StableRankingsHistory = {};
  for (const [id, entries] of Object.entries(history ?? {})) {
    if (!live.has(id)) continue;
    const retained = entries.filter(
      (e) => e.day > input.day - STABLE_RANKINGS_MAX_ENTRIES && e.day !== input.day,
    );
    if (retained.length) next[id] = retained;
  }
  for (const row of rows) {
    const snapshot: StableRankingsSnapshot = {
      day: input.day,
      rank: row.rank,
      points: row.points,
      earnedPoints: row.earnedPoints,
      earnings: row.earnings,
      reputation: row.reputation,
      price: row.price,
    };
    next[row.stableId] = [...(next[row.stableId] ?? []), snapshot].slice(
      -STABLE_RANKINGS_MAX_ENTRIES,
    );
  }
  return next;
}

/**
 * All days present in the history, newest first.
 * @param history
 */
export function stableRankingsDays(history: StableRankingsHistory): number[] {
  return [...new Set(Object.values(history).flatMap((entries) => entries.map((e) => e.day)))].sort(
    (a, b) => b - a,
  );
}
