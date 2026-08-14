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
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DeltaPill,
  MetricInfo,
  Sparkline,
  chartColors,
  formatCurrencyCompact,
} from "@/components/charts";
import { cn } from "@/lib/cn";
import { ArrowUpDown } from "lucide-react";
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
  weekBucket,
  type TimeWindowWeeks,
} from "@/core/analytics/timeWindow";
import {
  ALL_SURFACES,
  DEFAULT_WEEKS_A,
  DEFAULT_WEEKS_B,
  DIST_PRESETS,
  DIST_PRESET_MAP,
  TOP3_POSITION,
  WIN_POSITION,
  type DistPreset,
  type EntityKind,
  type Lookups,
  type MetricMode,
} from "@/core/analytics/regionalConstants";
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import { EntityDetailPanel } from "./EntityDetailPanel";

export type { MetricMode, DistPreset } from "@/core/analytics/regionalConstants";

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

interface MetricDef {
  key: string;
  label: string;
  value: (e: DrilldownEntity) => number;
  format: (n: number) => string;
  asPercent?: boolean;
  /** Weekly value for the sparkline, from that week's runs. */
  weekly: (runs: RegionRunRow[]) => number;
  definition: string;
}

const METRICS_RAW: MetricDef[] = [
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
    weekly: (r) => r.filter((x) => x.entry.position === 1).length,
    definition: "Runs finishing first.",
  },
  {
    key: "winPct",
    label: "Win %",
    value: (e) => (e.starts ? e.wins / e.starts : 0),
    format: (n) => `${(n * 100).toFixed(1)}%`,
    asPercent: true,
    weekly: (r) => (r.length ? r.filter((x) => x.entry.position === 1).length / r.length : 0),
    definition: "Wins divided by starts (strike rate).",
  },
  {
    key: "top3",
    label: "Top 3",
    value: (e) => e.top3,
    format: (n) => n.toLocaleString(),
    weekly: (r) => r.filter((x) => x.entry.position <= 3).length,
    definition: "Runs finishing first, second or third.",
  },
  {
    key: "g1Top3",
    label: "G1 top-3",
    value: (e) => e.g1Top3,
    format: (n) => n.toLocaleString(),
    weekly: (r) => r.filter((x) => x.isG1 && x.entry.position <= 3).length,
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

const METRICS_RATE: MetricDef[] = [
  {
    key: "winsPerStart",
    label: "Wins/Start",
    value: (e) => (e.starts ? e.wins / e.starts : 0),
    format: (n) => n.toFixed(2),
    weekly: (r) => (r.length ? r.filter((x) => x.entry.position === 1).length / r.length : 0),
    definition: "Wins divided by starts (per-start strike rate).",
  },
  {
    key: "top3Rate",
    label: "Top 3 %",
    value: (e) => (e.starts ? e.top3 / e.starts : 0),
    format: (n) => `${(n * 100).toFixed(1)}%`,
    asPercent: true,
    weekly: (r) => (r.length ? r.filter((x) => x.entry.position <= 3).length / r.length : 0),
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
      return g1.length ? g1.filter((x) => x.entry.position <= 3).length / g1.length : 0;
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

function entityKeyForRun(run: RegionRunRow, kind: EntityKind, lookups: Lookups): string | null {
  if (kind === "jockeys") return run.entry.jockeyId ?? null;
  const stableId = run.entry.stableId ?? null;
  if (!stableId) return null;
  if (kind === "stables") return stableId;
  return lookups.trainerByStable.get(stableId)?.id ?? null;
}

/** Weekly series for one entity/metric inside a window, oldest bucket first. */
function weeklySeries(
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

function linkFor(
  kind: EntityKind,
  id: string,
): { to: string; params: Record<string, string> } | null {
  if (kind === "jockeys") return { to: "/jockey/$jockeyId", params: { jockeyId: id } };
  if (kind === "trainers") return { to: "/staff/$staffId", params: { staffId: id } };
  if (id === "player") return null;
  return { to: "/npc-stables/$stableId", params: { stableId: id } };
}

function EntityName({ kind, row }: { kind: EntityKind; row: DrilldownEntity }) {
  const link = linkFor(kind, row.id);
  if (!link) return <span className="truncate text-cream/85">{row.name}</span>;
  return (
    <Link
      to={link.to as any}
      params={link.params as any}
      className="truncate text-cream/85 hover:text-[var(--chart-1)]"
    >
      {row.name}
    </Link>
  );
}

function EmptyState() {
  return (
    <p className="py-6 text-center text-[11px] font-mono uppercase tracking-wider text-cream/40">
      Nothing recorded for this region in the selected window.
    </p>
  );
}

function EntityTable({
  kind,
  rows,
  sortKey,
  sortDesc,
  onSort,
  metrics,
  expandedEntity,
  onExpand,
  runsA,
  runsB,
  lookups,
  day,
  weeks,
  weeksB,
}: {
  kind: EntityKind;
  rows: DrilldownEntity[];
  sortKey: string;
  sortDesc: boolean;
  onSort: (key: string) => void;
  metrics: MetricDef[];
  expandedEntity: string | null;
  onExpand: (id: string) => void;
  runsA: RegionRunRow[];
  runsB?: RegionRunRow[];
  lookups: Lookups;
  day: number;
  weeks: TimeWindowWeeks;
  weeksB?: TimeWindowWeeks;
}) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <div className="max-h-[60vh] overflow-auto pt-2">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-cream/45">
            <th className="px-2 py-1 text-left font-mono uppercase tracking-wider">Name</th>
            {metrics.map((m) => (
              <th key={m.key} className="px-2 py-1 text-right">
                <button
                  type="button"
                  onClick={() => onSort(m.key)}
                  className="inline-flex items-center gap-1 font-mono uppercase tracking-wider hover:text-cream"
                >
                  {m.label}
                  <ArrowUpDown
                    className={cn(
                      "h-3 w-3",
                      sortKey === m.key ? "text-[var(--chart-1)]" : "opacity-30",
                      sortKey === m.key && !sortDesc && "rotate-180",
                    )}
                  />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <EntityRow
              key={r.id}
              kind={kind}
              row={r}
              metrics={metrics}
              expandedEntity={expandedEntity}
              onExpand={onExpand}
              runsA={runsA}
              runsB={runsB}
              lookups={lookups}
              day={day}
              weeks={weeks}
              weeksB={weeksB}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntityRow({
  kind,
  row,
  metrics,
  expandedEntity,
  onExpand,
  runsA,
  runsB,
  lookups,
  day,
  weeks,
  weeksB,
}: {
  kind: EntityKind;
  row: DrilldownEntity;
  metrics: MetricDef[];
  expandedEntity: string | null;
  onExpand: (id: string) => void;
  runsA: RegionRunRow[];
  runsB?: RegionRunRow[];
  lookups: Lookups;
  day: number;
  weeks: TimeWindowWeeks;
  weeksB?: TimeWindowWeeks;
}) {
  const isExpanded = expandedEntity === row.id;
  return (
    <>
      <tr
        className={cn(
          "cursor-pointer border-t border-white/5 hover:bg-white/[0.04]",
          isExpanded && "bg-white/[0.06]",
        )}
        onClick={() => onExpand(row.id)}
      >
        <td className="max-w-[160px] px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
          <EntityName kind={kind} row={row} />
        </td>
        {metrics.map((m) => (
          <td key={m.key} className="px-2 py-1.5 text-right font-mono tabular-nums text-cream/70">
            {m.format(m.value(row))}
          </td>
        ))}
      </tr>
      {isExpanded ? (
        <tr>
          <td colSpan={metrics.length + 1} className="px-2 pb-2">
            <EntityDetailPanel
              entityId={row.id}
              kind={kind}
              runsA={runsA}
              runsB={runsB}
              lookups={lookups}
              day={day}
              weeks={weeks}
              weeksB={weeksB}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CompareCards({
  kind,
  rows,
  rowsB,
  runsA,
  runsB,
  lookups,
  day,
  weeks,
  weeksB,
  metrics,
}: {
  kind: EntityKind;
  rows: DrilldownEntity[];
  rowsB: DrilldownEntity[];
  runsA: RegionRunRow[];
  runsB?: RegionRunRow[];
  lookups: Lookups;
  day: number;
  weeks: TimeWindowWeeks;
  weeksB: TimeWindowWeeks;
  metrics: MetricDef[];
}) {
  if (rows.length === 0) return <EmptyState />;
  const byId = new Map(rowsB.map((r) => [r.id, r]));
  const zero: DrilldownEntity = {
    id: "",
    name: "",
    starts: 0,
    wins: 0,
    top3: 0,
    earnings: 0,
    g1Top3: 0,
    g1Starts: 0,
  };

  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto pt-2">
      {rows.map((r) => {
        const b = byId.get(r.id) ?? zero;
        return (
          <div key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <EntityName kind={kind} row={r} />
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-cream/35">
                A {timeWindowLabel(weeks)} · B {timeWindowLabel(weeksB)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metrics.map((m) => {
                const a = m.value(r);
                const bv = m.value(b);
                const series = weeklySeries(runsA, r.id, kind, lookups, day, weeks, m);
                return (
                  <div key={m.key} className="rounded-md bg-white/[0.03] px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cream/45">
                        {m.label}
                      </span>
                      <MetricInfo
                        definition={`${m.definition} Pill = A−B: ${m.format(a)} over the last ${timeWindowLabel(weeks)} minus ${m.format(bv)} over the last ${timeWindowLabel(weeksB)}.`}
                        formula={
                          m.asPercent
                            ? "delta = pct(A) − pct(B), shown in percentage points. Sparkline = weekly value inside window A."
                            : "delta = value(A) − value(B). Sparkline = weekly value inside window A, oldest week on the left."
                        }
                      />
                    </div>
                    <div className="mt-0.5 flex items-baseline justify-between gap-1.5">
                      <span className="font-mono text-xs tabular-nums text-cream">
                        {m.format(a)}
                      </span>
                      <DeltaPill value={a - bv} asPercent={m.asPercent} />
                    </div>
                    <div className="mt-1">
                      <Sparkline
                        data={series.length > 1 ? series : [...series, ...series]}
                        height={26}
                        color={chartColors.primary}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
