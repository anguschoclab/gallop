/**
 * regionalConstants.ts - Shared constants and types for regional analytics.
 *
 * Centralises distance thresholds, surface names, distance presets, default
 * time windows, and shared type definitions so that RegionDrilldownDrawer,
 * useRegionalComparisonParams, EntityDetailPanel, and the regional-comparison
 * route all reference a single source of truth.
 */

import type { TimeWindowWeeks } from "./timeWindow";

/* ── Distance thresholds (metres) ─────────────────────────────────────── */

/** Upper bound for sprint trips (inclusive). */
export const DIST_SPRINT_MAX = 1400;
/** Upper bound for mile trips (inclusive). */
export const DIST_MILE_MAX = 1600;
/** Upper bound for route trips (inclusive). */
export const DIST_ROUTE_MAX = 2000;
/** Lower bound for staying trips (inclusive). */
export const DIST_STAYING_MIN = 2000;

/* ── Surface names ────────────────────────────────────────────────────── */

export const ALL_SURFACES = ["Turf", "Dirt", "Synthetic"] as const;

/* ── Metric mode ──────────────────────────────────────────────────────── */

export type MetricMode = "raw" | "rate";

/** All valid MetricMode values, for Zod enums and runtime validation. */
export const METRIC_MODES: readonly MetricMode[] = ["raw", "rate"];

/* ── Distance presets ─────────────────────────────────────────────────── */

export type DistPreset = "all" | "sprint" | "mile" | "route" | "staying";

/** All valid DistPreset values, for Zod enums and runtime validation. */
export const DIST_PRESET_VALUES: readonly DistPreset[] = [
  "all",
  "sprint",
  "mile",
  "route",
  "staying",
];

export const DIST_PRESETS: { value: DistPreset; label: string }[] = [
  { value: "sprint", label: "Sprint" },
  { value: "mile", label: "Mile" },
  { value: "route", label: "Route" },
  { value: "staying", label: "Staying" },
  { value: "all", label: "All" },
];

export const DIST_PRESET_MAP: Record<DistPreset, { distMin?: number; distMax?: number }> = {
  all: {},
  sprint: { distMin: 0, distMax: DIST_SPRINT_MAX },
  mile: { distMin: DIST_SPRINT_MAX, distMax: DIST_MILE_MAX },
  route: { distMin: DIST_MILE_MAX, distMax: DIST_ROUTE_MAX },
  staying: { distMin: DIST_STAYING_MIN },
};

/* ── Default time windows ─────────────────────────────────────────────── */

export const DEFAULT_WEEKS_A: TimeWindowWeeks = 12;
export const DEFAULT_WEEKS_B: TimeWindowWeeks = 4;

/** Fallback bucket count when weeks is 0 (all-time). */
export const FALLBACK_WEEK_BUCKETS = 1;

/* ── Racing position thresholds ───────────────────────────────────────── */

/** Finishing position that counts as a win. */
export const WIN_POSITION = 1;
/** Maximum finishing position (inclusive) that counts as a "top-3" / placed run. */
export const TOP3_POSITION = 3;

/* ── Shared entity types ──────────────────────────────────────────────── */

export type EntityKind = "jockeys" | "trainers" | "stables";

export interface Lookups {
  jockeyNames: Map<string, string>;
  stableNames: Map<string, string>;
  trainerByStable: Map<string, { id: string; name: string }>;
}
