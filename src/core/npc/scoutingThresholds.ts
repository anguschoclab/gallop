/**
 * scoutingThresholds.ts - Threshold rules for scouting (manual bulk + standing assignments)
 *
 * A single threshold set describes "which horses are worth a scout": rating,
 * potential, age, fame, form, race record, market value, gender, pool and how
 * stale an existing report may be. The Insights panel uses it to filter bulk
 * scouting; standing assignments reuse the exact same rules each day.
 *
 * Dependencies: @/core/horse/insightMetrics (InsightRow, InsightMetricKey)
 * Related files: scouting.ts (cost + report generation),
 *   game/store/slices/scoutingSlice.ts (assignment execution)
 */

import type { InsightRow, InsightMetricKey } from "@/core/horse/insightMetrics";

/** Which slice of the population an assignment looks at. */
export type ScoutingPool = "npc" | "market" | "all";

/** Gender bucket filter. */
export type ScoutingGenderFilter = "any" | "male" | "female";

/** How an existing scout report affects eligibility. */
export type ScoutingFreshness = "any" | "unscouted" | "stale";

export interface ScoutingThresholds {
  pool: ScoutingPool;
  /** Inclusive lower/upper bounds; null disables the bound. */
  minOverall: number | null;
  maxOverall: number | null;
  minPotential: number | null;
  minSpeed: number | null;
  minStamina: number | null;
  minAge: number | null;
  maxAge: number | null;
  minFame: number | null;
  maxFame: number | null;
  minForm: number | null;
  minStarts: number | null;
  maxStarts: number | null;
  minWinRate: number | null;
  minValue: number | null;
  maxValue: number | null;
  gender: ScoutingGenderFilter;
  freshness: ScoutingFreshness;
  /** Report older than this many days counts as stale (freshness = "stale"). */
  staleAfterDays: number;
  /** Skip horses whose scout fee exceeds this. */
  maxCostPerHorse: number | null;
}

/** Permissive defaults: everything in rival stables, never re-scout fresh reports. */
export function createDefaultScoutingThresholds(): ScoutingThresholds {
  return {
    pool: "npc",
    minOverall: null,
    maxOverall: null,
    minPotential: null,
    minSpeed: null,
    minStamina: null,
    minAge: null,
    maxAge: null,
    minFame: null,
    maxFame: null,
    minForm: null,
    minStarts: null,
    maxStarts: null,
    minWinRate: null,
    minValue: null,
    maxValue: null,
    gender: "any",
    freshness: "unscouted",
    staleAfterDays: 30,
    maxCostPerHorse: null,
  };
}

/** Every tunable numeric threshold, for generic slider/input rendering. */
export interface ThresholdFieldDef {
  key: keyof ScoutingThresholds;
  label: string;
  metric: InsightMetricKey;
  bound: "min" | "max";
  step: number;
  max: number;
}

export const THRESHOLD_FIELDS: ThresholdFieldDef[] = [
  {
    key: "minOverall",
    label: "Min overall rating",
    metric: "overall",
    bound: "min",
    step: 1,
    max: 100,
  },
  {
    key: "maxOverall",
    label: "Max overall rating",
    metric: "overall",
    bound: "max",
    step: 1,
    max: 100,
  },
  {
    key: "minPotential",
    label: "Min potential",
    metric: "potential",
    bound: "min",
    step: 1,
    max: 100,
  },
  { key: "minSpeed", label: "Min speed", metric: "speed", bound: "min", step: 1, max: 100 },
  { key: "minStamina", label: "Min stamina", metric: "stamina", bound: "min", step: 1, max: 100 },
  { key: "minAge", label: "Min age", metric: "age", bound: "min", step: 1, max: 25 },
  { key: "maxAge", label: "Max age", metric: "age", bound: "max", step: 1, max: 25 },
  { key: "minFame", label: "Min fame", metric: "fame", bound: "min", step: 1, max: 100 },
  { key: "maxFame", label: "Max fame", metric: "fame", bound: "max", step: 1, max: 100 },
  { key: "minForm", label: "Min form", metric: "form", bound: "min", step: 1, max: 10 },
  {
    key: "minStarts",
    label: "Min career starts",
    metric: "starts",
    bound: "min",
    step: 1,
    max: 60,
  },
  {
    key: "maxStarts",
    label: "Max career starts",
    metric: "starts",
    bound: "max",
    step: 1,
    max: 60,
  },
  {
    key: "minWinRate",
    label: "Min win rate %",
    metric: "winRate",
    bound: "min",
    step: 5,
    max: 100,
  },
  {
    key: "minValue",
    label: "Min market value",
    metric: "value",
    bound: "min",
    step: 5000,
    max: 5_000_000,
  },
  {
    key: "maxValue",
    label: "Max market value",
    metric: "value",
    bound: "max",
    step: 5000,
    max: 5_000_000,
  },
];

const FEMALE: string[] = ["filly", "mare"];

/** Context for one candidate horse beyond its plain metrics. */
export interface ScoutingCandidateContext {
  /** Days since the last scout report, or null when never scouted. */
  daysSinceScouted: number | null;
  /** Scout fee for this horse, when known. */
  cost?: number;
}

/**
 * Test one horse row against a threshold set.
 *
 * @param row - Flattened horse metrics.
 * @param t - Threshold set.
 * @param ctx - Scout freshness/cost context for the horse.
 * @returns True when the horse satisfies every active threshold.
 */
export function matchesScoutingThresholds(
  row: InsightRow,
  t: ScoutingThresholds,
  ctx: ScoutingCandidateContext = { daysSinceScouted: null },
): boolean {
  const m = row.metrics;
  const geMin = (v: number, min: number | null) => min === null || v >= min;
  const leMax = (v: number, max: number | null) => max === null || v <= max;

  if (!geMin(m.overall, t.minOverall) || !leMax(m.overall, t.maxOverall)) return false;
  if (!geMin(m.potential, t.minPotential)) return false;
  if (!geMin(m.speed, t.minSpeed)) return false;
  if (!geMin(m.stamina, t.minStamina)) return false;
  if (!geMin(m.age, t.minAge) || !leMax(m.age, t.maxAge)) return false;
  if (!geMin(m.fame, t.minFame) || !leMax(m.fame, t.maxFame)) return false;
  if (!geMin(m.form, t.minForm)) return false;
  if (!geMin(m.starts, t.minStarts) || !leMax(m.starts, t.maxStarts)) return false;
  if (!geMin(m.winRate, t.minWinRate)) return false;
  if (!geMin(m.value, t.minValue) || !leMax(m.value, t.maxValue)) return false;

  if (t.gender === "female" && !FEMALE.includes(row.gender)) return false;
  if (t.gender === "male" && FEMALE.includes(row.gender)) return false;

  if (t.freshness === "unscouted" && row.scouted) return false;
  if (t.freshness === "stale" && row.scouted) {
    const days = ctx.daysSinceScouted;
    if (days !== null && days < t.staleAfterDays) return false;
  }

  if (t.maxCostPerHorse !== null && ctx.cost !== undefined && ctx.cost > t.maxCostPerHorse) {
    return false;
  }
  return true;
}

/**
 * Human-readable summary chips for a threshold set.
 *
 * @param t - Threshold set
 */
export function describeScoutingThresholds(t: ScoutingThresholds): string[] {
  const out: string[] = [];
  for (const f of THRESHOLD_FIELDS) {
    const v = t[f.key] as number | null;
    if (v !== null && v !== undefined) out.push(`${f.label} ${v}`);
  }
  if (t.gender !== "any") out.push(t.gender === "female" ? "Fillies & mares" : "Males only");
  if (t.freshness === "unscouted") out.push("Unscouted only");
  if (t.freshness === "stale") out.push(`Reports older than ${t.staleAfterDays}d`);
  if (t.maxCostPerHorse !== null) out.push(`Fee ≤ ${t.maxCostPerHorse}`);
  return out;
}

/** Ordering used when the budget cannot cover every match. */
export type ScoutingPriority =
  "highestOverall" | "highestPotential" | "cheapest" | "lowestFame" | "youngest";

export const SCOUTING_PRIORITIES: { value: ScoutingPriority; label: string }[] = [
  { value: "highestOverall", label: "Highest rating first" },
  { value: "highestPotential", label: "Highest potential first" },
  { value: "cheapest", label: "Cheapest first" },
  { value: "lowestFame", label: "Least known first" },
  { value: "youngest", label: "Youngest first" },
];

/** A standing scouting order that runs automatically each day. */
export interface ScoutingAssignment {
  id: string;
  name: string;
  enabled: boolean;
  thresholds: ScoutingThresholds;
  /** Max spend per day across this assignment. */
  dailyBudget: number;
  /** Max horses scouted per day by this assignment. */
  maxPerDay: number;
  priority: ScoutingPriority;
  createdDay: number;
  lastRunDay: number | null;
  totalScouted: number;
  totalSpent: number;
}

/**
 * Create a standing assignment with sensible defaults.
 *
 * @param id - Unique id.
 * @param name - Display name.
 * @param day - Current game day.
 * @param thresholds - Threshold set to copy.
 */
export function createScoutingAssignment(
  id: string,
  name: string,
  day: number,
  thresholds: ScoutingThresholds = createDefaultScoutingThresholds(),
): ScoutingAssignment {
  return {
    id,
    name,
    enabled: true,
    thresholds: { ...thresholds },
    dailyBudget: 5000,
    maxPerDay: 3,
    priority: "highestOverall",
    createdDay: day,
    lastRunDay: null,
    totalScouted: 0,
    totalSpent: 0,
  };
}

export interface ScoutingCandidate {
  row: InsightRow;
  cost: number;
  daysSinceScouted: number | null;
}

export interface ScoutingRunPlan {
  targets: string[];
  estimatedCost: number;
  matched: number;
  skippedForBudget: number;
}

function priorityScore(c: ScoutingCandidate, p: ScoutingPriority): number {
  switch (p) {
    case "highestPotential":
      return -c.row.metrics.potential;
    case "cheapest":
      return c.cost;
    case "lowestFame":
      return c.row.metrics.fame;
    case "youngest":
      return c.row.metrics.age;
    case "highestOverall":
    default:
      return -c.row.metrics.overall;
  }
}

/**
 * Decide which horses an assignment scouts today.
 *
 * Matches thresholds, orders by priority, then fills until the daily budget,
 * per-day cap or available cash runs out. Pure and deterministic.
 *
 * @param candidates - Eligible horses with their scout fee.
 * @param assignment - Assignment being run.
 * @param availableCash - Player cash on hand.
 * @returns Target horse ids and the estimated spend.
 */
export function planScoutingRun(
  candidates: ScoutingCandidate[],
  assignment: ScoutingAssignment,
  availableCash: number,
): ScoutingRunPlan {
  const matched = candidates.filter((c) =>
    matchesScoutingThresholds(c.row, assignment.thresholds, {
      daysSinceScouted: c.daysSinceScouted,
      cost: c.cost,
    }),
  );

  const ordered = [...matched].sort((a, b) => {
    const diff = priorityScore(a, assignment.priority) - priorityScore(b, assignment.priority);
    return diff !== 0 ? diff : a.row.id.localeCompare(b.row.id);
  });

  const targets: string[] = [];
  let spend = 0;
  for (const c of ordered) {
    if (targets.length >= assignment.maxPerDay) break;
    if (spend + c.cost > assignment.dailyBudget) continue;
    if (spend + c.cost > availableCash) continue;
    targets.push(c.row.id);
    spend += c.cost;
  }

  return {
    targets,
    estimatedCost: spend,
    matched: matched.length,
    skippedForBudget: matched.length - targets.length,
  };
}

/**
 * Build a map of horse id to the day of its most recent scout report.
 * Shared by the scouting slice (skip already-scouted horses) and the Insights
 * panel (stale-report filtering).
 *
 * @param reports - Scout reports to scan
 * @returns Map of horse id to the latest report day
 */
export function lastScoutDayByHorse(
  reports: { horseId: string; day: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of reports) {
    const prev = map.get(r.horseId);
    if (prev === undefined || r.day > prev) map.set(r.horseId, r.day);
  }
  return map;
}
