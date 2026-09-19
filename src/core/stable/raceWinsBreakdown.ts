/**
 * raceWinsBreakdown.ts - Aggregations of player race wins for the Race Wins dashboard
 *
 * Groups derived race wins by racecourse, grade and distance bucket, plus a
 * cumulative earnings-by-day series. Pure derivation only.
 *
 * Dependencies: ./raceWins
 * Related files: src/components/portfolio/RaceWinsDashboard.tsx, src/routes/portfolio.tsx
 */

import type { PlayerRaceWinRecord } from "./raceWins";

export interface WinGroup {
  key: string;
  label: string;
  wins: number;
  earnings: number;
  averagePayout: number;
}

export interface EarningsPoint {
  x: number;
  y: number;
}

const DISTANCE_BUCKETS: { label: string; max: number }[] = [
  { label: "Sprint (<1400m)", max: 1400 },
  { label: "Mile (1400-1700m)", max: 1700 },
  { label: "Middle (1700-2200m)", max: 2200 },
  { label: "Route (2200-2800m)", max: 2800 },
  { label: "Staying (2800m+)", max: Infinity },
];
/**
 * Returns the distance-bucket label for a race distance in metres.
 * @param distance - The race distance in metres
 * @returns The label
 */

export function distanceBucketLabel(distance?: number): string {
  if (!distance || distance <= 0) return "Unknown";
  return DISTANCE_BUCKETS.find((b) => distance < b.max)?.label ?? "Unknown";
}

function group(
  wins: PlayerRaceWinRecord[],
  keyFor: (w: PlayerRaceWinRecord) => string,
  labelFor?: (key: string) => string,
): WinGroup[] {
  const map = new Map<string, WinGroup>();
  for (const w of wins) {
    const key = keyFor(w);
    const existing = map.get(key);
    if (existing) {
      existing.wins += 1;
      existing.earnings += w.payout;
    } else {
      map.set(key, {
        key,
        label: labelFor ? labelFor(key) : key,
        wins: 1,
        earnings: w.payout,
        averagePayout: 0,
      });
    }
  }
  return [...map.values()]
    .map((g) => ({ ...g, averagePayout: g.wins ? Math.round(g.earnings / g.wins) : 0 }))
    .sort((a, b) => b.earnings - a.earnings || b.wins - a.wins);
}

/**
 * Earnings and wins grouped by racecourse.
 * @param wins - The wins to aggregate
 * @returns The aggregated groups
 */
export function winsByCourse(wins: PlayerRaceWinRecord[]): WinGroup[] {
  return group(wins, (w) => w.track?.trim() || "Unknown course");
}

/**
 * Earnings and wins grouped by grade (graded races first, then ungraded).
 * @param wins - The wins to aggregate
 * @returns The aggregated groups
 */
export function winsByGrade(wins: PlayerRaceWinRecord[]): WinGroup[] {
  return group(wins, (w) => w.grade?.trim() || w.raceClass?.trim() || "Ungraded");
}

/**
 * Earnings and wins grouped by distance bucket.
 * @param wins - The wins to aggregate
 * @returns The aggregated groups
 */
export function winsByDistance(wins: PlayerRaceWinRecord[]): WinGroup[] {
  const order = [...DISTANCE_BUCKETS.map((b) => b.label), "Unknown"];
  return group(wins, (w) => distanceBucketLabel(w.distance)).sort(
    (a, b) => order.indexOf(a.label) - order.indexOf(b.label),
  );
}

/**
 * Cumulative racing earnings over time, oldest day first.
 * @param wins - The wins to aggregate
 * @returns The cumulative earnings points
 */
export function cumulativeEarnings(wins: PlayerRaceWinRecord[]): EarningsPoint[] {
  const byDay = new Map<number, number>();
  for (const w of wins) byDay.set(w.day, (byDay.get(w.day) ?? 0) + w.payout);
  let running = 0;
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, amount]) => {
      running += amount;
      return { x: day, y: running };
    });
}
