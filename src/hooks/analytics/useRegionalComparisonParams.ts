import { useCallback } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { RegionKey } from "@/core/analytics/regionalTrends";
import type { TimeWindowWeeks } from "@/core/analytics/timeWindow";

type GenericNavigateFn = (opts: {
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>);
  replace?: boolean;
}) => void;

export type MetricMode = "raw" | "rate";
export type DistPreset = "all" | "sprint" | "mile" | "route" | "staying";

export interface RegionalComparisonParams {
  region: RegionKey | null;
  weeksA: TimeWindowWeeks;
  weeksB: TimeWindowWeeks;
  metric: MetricMode;
  compare: boolean;
  surface: string[];
  distMin: number | undefined;
  distMax: number | undefined;
  distPreset: DistPreset;
}

const ALL_SURFACES = ["Turf", "Dirt", "Synthetic"];

const DIST_PRESET_MAP: Record<DistPreset, { distMin?: number; distMax?: number }> = {
  all: {},
  sprint: { distMin: 0, distMax: 1400 },
  mile: { distMin: 1400, distMax: 1600 },
  route: { distMin: 1600, distMax: 2000 },
  staying: { distMin: 2000 },
};

const VALID_WEEKS = [4, 8, 12, 26, 52, 0] as const;

function coerceWeeks(value: unknown, fallback: TimeWindowWeeks): TimeWindowWeeks {
  return (VALID_WEEKS as readonly number[]).includes(value as number)
    ? (value as TimeWindowWeeks)
    : fallback;
}

function parseSurface(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [...ALL_SURFACES];
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [...ALL_SURFACES];
}

function parseDistPreset(raw: unknown): DistPreset {
  const valid: DistPreset[] = ["all", "sprint", "mile", "route", "staying"];
  return valid.includes(raw as DistPreset) ? (raw as DistPreset) : "all";
}

export function useRegionalComparisonParams() {
  const navigate = useNavigate() as unknown as GenericNavigateFn;
  const search = useSearch({ strict: false }) as Record<string, unknown>;

  const region = (search.region as RegionKey | undefined) ?? null;
  const weeksA = coerceWeeks(search.weeksA, 12);
  const weeksB = coerceWeeks(search.weeksB, 4);
  const metric: MetricMode = search.metric === "rate" ? "rate" : "raw";
  const compare = search.compare === true;
  const surface = parseSurface(search.surface);
  const distMin = typeof search.distMin === "number" ? search.distMin : undefined;
  const distMax = typeof search.distMax === "number" ? search.distMax : undefined;
  const distPreset = parseDistPreset(search.distPreset);

  const update = useCallback(
    (patch: Record<string, unknown>) => {
      navigate({
        search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
      });
    },
    [navigate],
  );

  const setRegion = useCallback(
    (next: RegionKey | null) => {
      update({ region: next ?? undefined });
    },
    [update],
  );

  const setWeeksA = useCallback(
    (next: TimeWindowWeeks) => {
      update({ weeksA: next });
    },
    [update],
  );

  const setWeeksB = useCallback(
    (next: TimeWindowWeeks) => {
      update({ weeksB: next });
    },
    [update],
  );

  const setMetric = useCallback(
    (next: MetricMode) => {
      update({ metric: next });
    },
    [update],
  );

  const setCompare = useCallback(
    (next: boolean) => {
      update({ compare: next });
    },
    [update],
  );

  const setSurface = useCallback(
    (next: string[]) => {
      update({ surface: next.length > 0 ? next.join(",") : undefined });
    },
    [update],
  );

  const setDistPreset = useCallback(
    (next: DistPreset) => {
      const mapping = DIST_PRESET_MAP[next];
      update({ distPreset: next, distMin: mapping.distMin, distMax: mapping.distMax });
    },
    [update],
  );

  return {
    region,
    weeksA,
    weeksB,
    metric,
    compare,
    surface,
    distMin,
    distMax,
    distPreset,
    setRegion,
    setWeeksA,
    setWeeksB,
    setMetric,
    setCompare,
    setSurface,
    setDistPreset,
  };
}
