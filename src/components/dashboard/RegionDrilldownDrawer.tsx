/**
 * RegionDrilldownDrawer.tsx - Drill-down for one racing region.
 *
 * Plain mode: sortable tables of jockeys / trainers / stables + a run log.
 * Compare mode: pick a second N-week window; every metric shows its window-A
 * weekly sparkline plus an A−B delta pill with a tooltip that spells out the
 * arithmetic behind the pill.
 *
 * Supports metric toggle (raw vs per-start rates), surface/distance filters,
 * and inline entity drill-down via EntityDetailPanel.
 */
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricInfo, formatCurrencyCompact } from "@/components/charts";
import { cn } from "@/lib/cn";
import {
  computeRegionDrilldown,
  regionNameFor,
  type DrilldownEntity,
  type RegionKey,
  type RegionRunRow,
} from "@/core/analytics/regionalTrends";
import {
  TIME_WINDOW_OPTIONS,
  timeWindowLabel,
  type TimeWindowWeeks,
} from "@/core/analytics/timeWindow";
import {
  ALL_SURFACES,
  DEFAULT_WEEKS_A,
  DEFAULT_WEEKS_B,
  DIST_PRESETS,
  DIST_PRESET_MAP,
  type DistPreset,
  type EntityKind,
  type Lookups,
  type MetricMode,
} from "@/constants/regionalConstants";
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import { METRICS_RAW, METRICS_RATE, type MetricDef } from "./regionalMetrics";
import { EntityTable, CompareCards } from "./RegionDrilldownComponents";

export type { MetricMode, DistPreset } from "@/constants/regionalConstants";

interface Props {
  region: RegionKey | null;
  weeks: TimeWindowWeeks;
  horses: Horse[];
  races: Race[];
  day: number;
  lookups: Lookups;
  onClose: () => void;
  /** External metric mode (route mode). If omitted, internal state is used. */
  metricMode?: MetricMode;
  onMetricModeChange?: (m: MetricMode) => void;
  /** External surface filter (route mode). */
  surfaceFilter?: string[];
  onSurfaceChange?: (s: string[]) => void;
  /** External distance preset (route mode). */
  distPreset?: DistPreset;
  onDistPresetChange?: (p: DistPreset) => void;
}

export function RegionDrilldownDrawer({
  region,
  weeks,
  horses,
  races,
  day,
  lookups,
  onClose,
  metricMode: externalMetricMode,
  onMetricModeChange,
  surfaceFilter: externalSurface,
  onSurfaceChange,
  distPreset: externalDistPreset,
  onDistPresetChange,
}: Props) {
  const [compare, setCompare] = useState(false);
  const [weeksB, setWeeksB] = useState<TimeWindowWeeks>(
    weeks === DEFAULT_WEEKS_B ? DEFAULT_WEEKS_A : DEFAULT_WEEKS_B,
  );
  const [internalMetricMode, setInternalMetricMode] = useState<MetricMode>("raw");
  const [internalSurface, setInternalSurface] = useState<string[]>([...ALL_SURFACES]);
  const [internalDistPreset, setInternalDistPreset] = useState<DistPreset>("all");
  const [sortKey, setSortKey] = useState<string>("earnings");
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  const metricMode = externalMetricMode ?? internalMetricMode;
  const surfaceFilter = externalSurface ?? internalSurface;
  const distPreset = externalDistPreset ?? internalDistPreset;

  const activeMetrics = metricMode === "rate" ? METRICS_RATE : METRICS_RAW;

  const setMetricMode = (m: MetricMode) => {
    if (onMetricModeChange) onMetricModeChange(m);
    else setInternalMetricMode(m);
    setSortKey(m === "rate" ? "earningsPerStart" : "earnings");
    setSortDesc(true);
  };

  const setSurface = (s: string[]) => {
    if (onSurfaceChange) onSurfaceChange(s);
    else setInternalSurface(s);
  };

  const setDistPreset = (p: DistPreset) => {
    if (onDistPresetChange) onDistPresetChange(p);
    else setInternalDistPreset(p);
  };

  const distMapping = DIST_PRESET_MAP[distPreset];

  const baseArgs = {
    horses,
    races,
    currentDay: day,
    ownedOnly: true as const,
    surface: surfaceFilter.length > 0 ? surfaceFilter : undefined,
    distMin: distMapping.distMin,
    distMax: distMapping.distMax,
  };

  const dataA = useMemo(
    () => (region ? computeRegionDrilldown({ ...baseArgs, weeks, region, ...lookups }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, weeks, horses, races, day, lookups, surfaceFilter, distPreset],
  );
  const dataB = useMemo(
    () =>
      region && compare
        ? computeRegionDrilldown({ ...baseArgs, weeks: weeksB, region, ...lookups })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, compare, weeksB, horses, races, day, lookups, surfaceFilter, distPreset],
  );

  const sortRows = (rows: DrilldownEntity[]) => {
    const metric =
      activeMetrics.find((m) => m.key === sortKey) ?? activeMetrics[activeMetrics.length - 1]!;
    return [...rows].sort((a, b) => {
      const d = metric.value(a) - metric.value(b);
      return sortDesc ? -d : d;
    });
  };

  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const toggleSurface = (s: string) => {
    setSurface(
      surfaceFilter.includes(s) ? surfaceFilter.filter((x) => x !== s) : [...surfaceFilter, s],
    );
  };

  return (
    <Sheet open={!!region} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-cream">
            {region ? regionNameFor(region) : ""} ·{" "}
            <span className="font-mono text-xs uppercase tracking-wider text-cream/50">
              last {timeWindowLabel(weeks)}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCompare((c) => !c)}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
              compare
                ? "border-[var(--chart-1)] text-[var(--chart-1)]"
                : "border-white/10 text-cream/60 hover:text-cream",
            )}
          >
            Compare windows
          </button>

          <button
            type="button"
            onClick={() => setMetricMode("raw")}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
              metricMode === "raw"
                ? "border-[var(--chart-1)] text-[var(--chart-1)]"
                : "border-white/10 text-cream/60 hover:text-cream",
            )}
          >
            Raw
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("rate")}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
              metricMode === "rate"
                ? "border-[var(--chart-1)] text-[var(--chart-1)]"
                : "border-white/10 text-cream/60 hover:text-cream",
            )}
          >
            Per-start rates
          </button>

          {compare ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cream/40">
                A {timeWindowLabel(weeks)} vs B
              </span>
              {TIME_WINDOW_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setWeeksB(o.value)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
                    weeksB === o.value
                      ? "bg-[color-mix(in_oklab,var(--chart-1)_25%,transparent)] text-cream"
                      : "text-cream/45 hover:text-cream/80",
                  )}
                >
                  {o.label}
                </button>
              ))}
              <MetricInfo
                definition={`Each pill is the A−B difference: the metric over the last ${timeWindowLabel(weeks)} (window A) minus the same metric over the last ${timeWindowLabel(weeksB)} (window B), for the same region and entity.`}
                formula="delta = value(A) − value(B); percentage metrics are differenced in percentage points. Sparkline = the metric's weekly values inside window A, oldest week left."
              />
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cream/40">
            Surface
          </span>
          {ALL_SURFACES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSurface(s)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
                surfaceFilter.includes(s)
                  ? "bg-[color-mix(in_oklab,var(--chart-1)_25%,transparent)] text-cream"
                  : "text-cream/35 hover:text-cream/70",
              )}
            >
              {s}
            </button>
          ))}

          <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-cream/40">
            Trip
          </span>
          {DIST_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setDistPreset(p.value)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
                distPreset === p.value
                  ? "bg-[color-mix(in_oklab,var(--chart-1)_25%,transparent)] text-cream"
                  : "text-cream/35 hover:text-cream/70",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {dataA ? (
          <Tabs defaultValue="jockeys" className="mt-3">
            <TabsList>
              <TabsTrigger value="jockeys">Jockeys ({dataA.jockeys.length})</TabsTrigger>
              <TabsTrigger value="trainers">Trainers ({dataA.trainers.length})</TabsTrigger>
              <TabsTrigger value="stables">Stables ({dataA.stables.length})</TabsTrigger>
              <TabsTrigger value="runs">Runs ({dataA.runs.length})</TabsTrigger>
            </TabsList>

            {(["jockeys", "trainers", "stables"] as EntityKind[]).map((kind) => (
              <TabsContent key={kind} value={kind}>
                {compare ? (
                  <CompareCards
                    kind={kind}
                    rows={sortRows(dataA[kind])}
                    rowsB={dataB ? dataB[kind] : []}
                    runsA={dataA.runs}
                    runsB={dataB?.runs}
                    lookups={lookups}
                    day={day}
                    weeks={weeks}
                    weeksB={weeksB}
                    metrics={activeMetrics}
                  />
                ) : (
                  <EntityTable
                    kind={kind}
                    rows={sortRows(dataA[kind])}
                    sortKey={sortKey}
                    sortDesc={sortDesc}
                    onSort={toggleSort}
                    metrics={activeMetrics}
                    expandedEntity={expandedEntity}
                    onExpand={(id) => setExpandedEntity((prev) => (prev === id ? null : id))}
                    runsA={dataA.runs}
                    runsB={dataB?.runs}
                    lookups={lookups}
                    day={day}
                    weeks={weeks}
                    weeksB={weeksB}
                  />
                )}
              </TabsContent>
            ))}

            <TabsContent value="runs">
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto pt-2">
                {dataA.runs.map((r, i) => (
                  <li
                    key={`${r.entry.raceId}-${r.horseId}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-white/[0.03] px-2 py-1.5 text-[11px]"
                  >
                    <span className="truncate text-cream/80">
                      {r.entry.raceName}
                      <span className="ml-2 font-mono text-cream/40">D{r.entry.day}</span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-cream/60">
                      {r.horseName} · {r.entry.position}
                      {r.isG1 ? " · G1" : ""} · {formatCurrencyCompact(r.entry.purseEarned ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
