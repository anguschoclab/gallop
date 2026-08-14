import type { TimeWindowWeeks } from "@/core/analytics/timeWindow";

export const DIST_SPRINT_MAX = 1400;
export const DIST_MILE_MAX = 1600;
export const DIST_ROUTE_MAX = 2000;
export const DIST_STAYING_MIN = 2000;

export const ALL_SURFACES = ["Turf", "Dirt", "Synthetic"] as const;

export type MetricMode = "raw" | "rate";

export const METRIC_MODES: readonly MetricMode[] = ["raw", "rate"];

export type DistPreset = "all" | "sprint" | "mile" | "route" | "staying";

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

export const DEFAULT_WEEKS_A: TimeWindowWeeks = 12;
export const DEFAULT_WEEKS_B: TimeWindowWeeks = 4;

export const FALLBACK_WEEK_BUCKETS = 1;

export type EntityKind = "jockeys" | "trainers" | "stables";

export interface Lookups {
  jockeyNames: Map<string, string>;
  stableNames: Map<string, string>;
  trainerByStable: Map<string, { id: string; name: string }>;
}
