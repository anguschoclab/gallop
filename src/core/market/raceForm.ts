/**
 * raceForm.ts - Race results → world rankings and market price premium.
 *
 * Every resolved race (player or NPC) lands in `horse.raceHistory`. This module
 * turns those results into ranking points and a price multiplier so horses that
 * win — especially graded races — rise in value on the Auction Houses chart.
 *
 * Pure: no state mutation. Depends only on the Horse type.
 */

import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";

/** Ranking points by finishing position (1st, 2nd, 3rd). */
const POSITION_POINTS = [10, 5, 3] as const;
/** Grade multipliers applied to ranking points and price premium. */
const GRADE_WEIGHT: Record<string, number> = { G1: 5, G2: 3, G3: 2, Listed: 1.5 };
/** Results fade over roughly one racing year. */
const FORM_HALF_LIFE_DAYS = 180;
/** Hard cap on the race-form price multiplier. */
export const RACE_FORM_PREMIUM_CAP = 2.5;

function gradeWeight(grade?: string): number {
  return (grade && GRADE_WEIGHT[grade]) || 1;
}

function decay(entryDay: number, day: number): number {
  const age = Math.max(0, day - entryDay);
  return Math.pow(0.5, age / FORM_HALF_LIFE_DAYS);
}

function latestDay(history: HorseRaceHistoryEntry[]): number {
  let d = 0;
  for (const e of history) if (e.day > d) d = e.day;
  return d;
}

/**
 * Ranking points for a single result.
 * @param entry - Race history entry.
 * @returns Undecayed points.
 */
export function resultPoints(entry: HorseRaceHistoryEntry): number {
  const base = POSITION_POINTS[entry.position - 1] ?? 0;
  return base * gradeWeight(entry.grade);
}

/**
 * Price multiplier from race results. Wins add 4% each (× grade weight),
 * places 1.5%, shows 0.75%, decayed by recency. Horses without results = 1.
 * @param horse - Horse to value.
 * @param day - Reference day; defaults to the horse's latest start.
 * @returns Multiplier in [1, RACE_FORM_PREMIUM_CAP].
 */
export function raceFormPremium(horse: Pick<Horse, "raceHistory">, day?: number): number {
  const history = horse.raceHistory ?? [];
  if (history.length === 0) return 1;
  const ref = day ?? latestDay(history);
  let bonus = 0;
  for (const e of history) {
    const rate = e.position === 1 ? 0.04 : e.position === 2 ? 0.015 : e.position === 3 ? 0.0075 : 0;
    if (rate === 0) continue;
    bonus += rate * gradeWeight(e.grade) * decay(e.day, ref);
  }
  return Math.min(RACE_FORM_PREMIUM_CAP, 1 + bonus);
}

export interface WorldRankingRow {
  horseId: string;
  name: string;
  points: number;
  starts: number;
  wins: number;
  gradedWins: number;
  lastWin?: { raceName: string; day: number; grade?: string };
  premium: number;
}

/**
 * World rankings from recent race results (all stables, player included).
 * @param horses - All horses.
 * @param day - Current game day.
 * @param windowDays - Only results within this window count.
 * @param limit - Max rows.
 * @returns Rows sorted by points desc, then wins, then id (deterministic).
 */
export function worldRankings(
  horses: Horse[],
  day: number,
  windowDays = 365,
  limit = 25,
): WorldRankingRow[] {
  const rows: WorldRankingRow[] = [];
  for (const h of horses) {
    if (h.lifecycleStatus === "deceased") continue;
    const recent = (h.raceHistory ?? []).filter((e) => day - e.day <= windowDays && e.day <= day);
    if (recent.length === 0) continue;
    let points = 0;
    let wins = 0;
    let gradedWins = 0;
    let lastWin: WorldRankingRow["lastWin"];
    for (const e of recent) {
      points += resultPoints(e) * decay(e.day, day);
      if (e.position === 1) {
        wins++;
        if (e.grade && e.grade !== "Listed") gradedWins++;
        if (!lastWin || e.day > lastWin.day) {
          lastWin = { raceName: e.raceName, day: e.day, grade: e.grade };
        }
      }
    }
    if (points <= 0) continue;
    rows.push({
      horseId: h.id,
      name: h.name,
      points: Math.round(points * 10) / 10,
      starts: recent.length,
      wins,
      gradedWins,
      lastWin,
      premium: raceFormPremium(h, day),
    });
  }
  rows.sort((a, b) => b.points - a.points || b.wins - a.wins || a.horseId.localeCompare(b.horseId));
  return rows.slice(0, limit);
}
