/**
 * dailyProgress.ts - Per-horse end-of-day snapshots (stats, form, price)
 * for the player's horses, capped per horse. Recorded by the daily pipeline.
 */
import type { Horse } from "@/core/horse/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { calculateOverallRating } from "@/core/horse/stats";
import { horseMarketValue } from "@/core/horse/pricing";

export const DAILY_PROGRESS_MAX_ENTRIES = 60;

export interface HorseDailySnapshot {
  day: number;
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
  ovr: number;
  form: number;
  energy: number;
  price: number;
}

export type HorseDailyProgress = Record<string, HorseDailySnapshot[]>;

const r1 = (n: number) => Math.round((n ?? 0) * 10) / 10;

export function snapshotHorse(horse: Horse, day: number, allHorses: Horse[]): HorseDailySnapshot {
  return {
    day,
    speed: r1(horse.stats.speed),
    stamina: r1(horse.stats.stamina),
    acceleration: r1(horse.stats.acceleration),
    consistency: r1(horse.stats.consistency),
    ovr: r1(calculateOverallRating(horse)),
    form: r1(horse.form),
    energy: Math.round(horse.energy ?? 0),
    price: horseMarketValue(horse, allHorses),
  };
}

/**
 * Append today's snapshot for every player-owned horse; drop horses no longer owned.
 * @param history
 * @param horses
 * @param day
 */
export function recordDailyProgress(
  history: HorseDailyProgress | undefined,
  horses: Horse[],
  day: number,
): HorseDailyProgress {
  const next: HorseDailyProgress = {};
  for (const h of horses) {
    if (!h?.stats || !isPlayerOwned(h) || h.lifecycleStatus === "deceased") continue;
    const prev = (history?.[h.id] ?? []).filter((s) => s.day !== day);
    const list = [...prev, snapshotHorse(h, day, horses)];
    next[h.id] = list.slice(-DAILY_PROGRESS_MAX_ENTRIES);
  }
  return next;
}
