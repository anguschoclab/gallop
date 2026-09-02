/**
 * insightMetrics.ts - Metric definitions for large-scale horse comparison (Scouting Insights)
 *
 * Turns a Horse into a flat numeric row so a scatter plot can plot any metric
 * against any other metric without each chart knowing about the Horse shape.
 *
 * Dependencies: @/core/horse/types (Horse), @/core/horse/pricing (horseMarketValue),
 * @/core/horse/rating (calculateOverallRating), @/core/common/formatting (formatCurrency)
 */

import type { Horse } from "@/core/horse/types";
import { horseMarketValue } from "@/core/horse/pricing";
import { calculateOverallRating } from "@/core/horse/stats";
import { formatCurrency } from "@/core/common/formatting";

export type InsightMetricKey =
  | "overall"
  | "speed"
  | "stamina"
  | "acceleration"
  | "temperament"
  | "consistency"
  | "conformation"
  | "potential"
  | "age"
  | "fame"
  | "form"
  | "value"
  | "earnings"
  | "starts"
  | "wins"
  | "winRate"
  | "distanceAptitude";

export interface InsightMetric {
  key: InsightMetricKey;
  label: string;
  /** Short axis label. */
  short: string;
  format: (v: number) => string;
}

const int = (v: number) => Math.round(v).toLocaleString();
const one = (v: number) => v.toFixed(1);
const pct = (v: number) => `${v.toFixed(0)}%`;

/** All metrics that can be mapped onto a scatter-plot axis. */
export const INSIGHT_METRICS: InsightMetric[] = [
  { key: "overall", label: "Overall rating", short: "OVR", format: int },
  { key: "speed", label: "Speed", short: "Speed", format: int },
  { key: "stamina", label: "Stamina", short: "Stamina", format: int },
  { key: "acceleration", label: "Acceleration", short: "Accel", format: int },
  { key: "temperament", label: "Temperament", short: "Temper", format: int },
  { key: "consistency", label: "Consistency", short: "Consist", format: int },
  { key: "conformation", label: "Conformation", short: "Conform", format: int },
  { key: "potential", label: "Potential", short: "Potential", format: int },
  { key: "age", label: "Age", short: "Age", format: one },
  { key: "fame", label: "Fame", short: "Fame", format: int },
  { key: "form", label: "Form", short: "Form", format: one },
  { key: "value", label: "Market value", short: "Value", format: (v) => formatCurrency(v) },
  { key: "earnings", label: "Lifetime earnings", short: "Earnings", format: (v) => formatCurrency(v) },
  { key: "starts", label: "Career starts", short: "Starts", format: int },
  { key: "wins", label: "Career wins", short: "Wins", format: int },
  { key: "winRate", label: "Win rate", short: "Win %", format: pct },
  { key: "distanceAptitude", label: "Distance aptitude", short: "Dist apt", format: int },
];

export const INSIGHT_METRIC_BY_KEY: Record<InsightMetricKey, InsightMetric> = INSIGHT_METRICS.reduce(
  (acc, m) => {
    acc[m.key] = m;
    return acc;
  },
  {} as Record<InsightMetricKey, InsightMetric>,
);

/** A horse flattened into plottable numbers plus display metadata. */
export interface InsightRow {
  id: string;
  name: string;
  gender: string;
  ownerLabel: string;
  ownerId: string | null;
  scouted: boolean;
  metrics: Record<InsightMetricKey, number>;
}

/**
 * Flatten a horse into an InsightRow.
 *
 * @param horse - Horse to flatten.
 * @param allHorses - Population used for relative market valuation.
 * @param ownerLabel - Display name of the owning stable ("Unowned" for world stock).
 * @param ownerId - Stable id when NPC owned, otherwise null.
 */
export function buildInsightRow(
  horse: Horse,
  allHorses: Horse[],
  ownerLabel: string,
  ownerId: string | null,
): InsightRow {
  const starts = horse.careerStarts ?? 0;
  const wins = horse.careerWins ?? 0;
  return {
    id: horse.id,
    name: horse.name,
    gender: horse.gender,
    ownerLabel,
    ownerId,
    scouted: horse.lastScoutedDay !== undefined,
    metrics: {
      overall: calculateOverallRating(horse),
      speed: horse.stats.speed,
      stamina: horse.stats.stamina,
      acceleration: horse.stats.acceleration,
      temperament: horse.stats.temperament,
      consistency: horse.stats.consistency,
      conformation: horse.stats.conformation,
      potential: horse.potential ?? 0,
      age: horse.age ?? 0,
      fame: horse.fame ?? 0,
      form: horse.form ?? 0,
      value: horseMarketValue(horse, allHorses),
      earnings: horse.lifetimeEarnings ?? 0,
      starts,
      wins,
      winRate: starts > 0 ? (wins / starts) * 100 : 0,
      distanceAptitude: horse.distanceAptitude ?? 0,
    },
  };
}

/** Min/max of a metric across rows, widened when all values are identical. */
export function metricExtent(rows: InsightRow[], key: InsightMetricKey): [number, number] {
  if (rows.length === 0) return [0, 1];
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    const v = r.metrics[key];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}
