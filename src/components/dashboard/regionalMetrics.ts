import {
  DeltaPill,
  MetricInfo,
  Sparkline,
  chartColors,
  formatCurrencyCompact,
} from "@/components/charts";
import {
  computeRegionDrilldown,
  type DrilldownEntity,
  type RegionKey,
  type RegionRunRow,
} from "@/core/analytics/regionalTrends";
import { weekBucket, type TimeWindowWeeks } from "@/core/analytics/timeWindow";
import type { EntityKind, Lookups } from "@/constants/regionalConstants";
import {
  POSITION_WIN as WIN_POSITION,
  TOP_FINISH_POSITION as TOP3_POSITION,
} from "@/constants/raceSimulationConstants";
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";

export interface MetricDef {
  key: string;
  label: string;
  value: (e: DrilldownEntity) => number;
  format: (n: number) => string;
  asPercent?: boolean;
  weekly: (runs: RegionRunRow[]) => number;
  definition: string;
}

export const METRICS_RAW: MetricDef[] = [
  {
    key: "starts",
    label: "Starts",
    value: (e) => e.starts,
    format: (n) => n.toLocaleString(),
    weekly: (r) => r.length,
    definition: "Number of your runs in this region.",
  },
  {
    key: "wins",
    label: "Wins",
    value: (e) => e.wins,
    format: (n) => n.toLocaleString(),
    weekly: (r) => r.filter((x) => x.entry.position === WIN_POSITION).length,
    definition: "Runs finishing first.",
  },
  {
    key: "winPct",
    label: "Win %",
    value: (e) => (e.starts ? e.wins / e.starts : 0),
    format: (n) => `${(n * 100).toFixed(1)}%`,
    asPercent: true,
    weekly: (r) =>
      r.length ? r.filter((x) => x.entry.position === WIN_POSITION).length / r.length : 0,
    definition: "Wins divided by starts (strike rate).",
  },
  {
    key: "top3",
    label: "Top 3",
    value: (e) => e.top3,
    format: (n) => n.toLocaleString(),
    weekly: (r) => r.filter((x) => x.entry.position <= TOP3_POSITION).length,
    definition: "Runs finishing first, second or third.",
  },
  {
    key: "g1Top3",
    label: "G1 top-3",
    value: (e) => e.g1Top3,
    format: (n) => n.toLocaleString(),
    weekly: (r) => r.filter((x) => x.isG1 && x.entry.position <= TOP3_POSITION).length,
    definition: "Grade 1 runs finishing in the first three.",
  },
  {
    key: "earnings",
    label: "Earnings",
    value: (e) => e.earnings,
    format: formatCurrencyCompact,
    weekly: (r) => r.reduce((s, x) => s + (x.entry.purseEarned ?? 0), 0),
    definition: "Prize money banked from these runs.",
  },
];

export const METRICS_RATE: MetricDef[] = [
  {
    key: "winsPerStart",
    label: "Wins/Start",
    value: (e) => (e.starts ? e.wins / e.starts : 0),
    format: (n) => n.toFixed(2),
    weekly: (r) =>
      r.length ? r.filter((x) => x.entry.position === WIN_POSITION).length / r.length : 0,
    definition: "Wins divided by starts (per-start strike rate).",
  },
  {
    key: "top3Rate",
    label: "Top 3 %",
    value: (e) => (e.starts ? e.top3 / e.starts : 0),
    format: (n) => `${(n * 100).toFixed(1)}%`,
    asPercent: true,
    weekly: (r) =>
      r.length ? r.filter((x) => x.entry.position <= TOP3_POSITION).length / r.length : 0,
    definition: "Top-3 finishes divided by starts.",
  },
  {
    key: "g1Top3Rate",
    label: "G1 top-3 %",
    value: (e) => (e.g1Starts ? e.g1Top3 / e.g1Starts : 0),
    format: (n) => `${(n * 100).toFixed(1)}%`,
    asPercent: true,
    weekly: (r) => {
      const g1 = r.filter((x) => x.isG1);
      return g1.length ? g1.filter((x) => x.entry.position <= TOP3_POSITION).length / g1.length : 0;
    },
    definition:
      "G1 top-3 finishes divided by G1 starts. Uses g1Starts as denominator for consistent denominators across windows.",
  },
  {
    key: "earningsPerStart",
    label: "Earnings/Start",
    value: (e) => (e.starts ? e.earnings / e.starts : 0),
    format: formatCurrencyCompact,
    weekly: (r) =>
      r.length ? r.reduce((s, x) => s + (x.entry.purseEarned ?? 0), 0) / r.length : 0,
    definition: "Prize money per start.",
  },
];

export function entityKeyForRun(
  run: RegionRunRow,
  kind: EntityKind,
  lookups: Lookups,
): string | null {
  if (kind === "jockeys") return run.entry.jockeyId ?? null;
  const stableId = run.entry.stableId ?? null;
  if (!stableId) return null;
  if (kind === "stables") return stableId;
  return lookups.trainerByStable.get(stableId)?.id ?? null;
}

export function weeklySeries(
  runs: RegionRunRow[],
  entityId: string,
  kind: EntityKind,
  lookups: Lookups,
  currentDay: number,
  weeks: TimeWindowWeeks,
  metric: MetricDef,
): number[] {
  const buckets = weeks || 1;
  const grouped: RegionRunRow[][] = Array.from({ length: buckets }, () => []);
  for (const run of runs) {
    if (entityKeyForRun(run, kind, lookups) !== entityId) continue;
    const b = weeks ? weekBucket(run.entry.day, currentDay, weeks) : 0;
    if (b >= 0) grouped[b]!.push(run);
  }
  return grouped.map((rows) => metric.weekly(rows));
}

export {
  computeRegionDrilldown,
  formatCurrencyCompact,
  DeltaPill,
  MetricInfo,
  Sparkline,
  chartColors,
};
