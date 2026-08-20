import { Link } from "@tanstack/react-router";
import {
  DeltaPill,
  MetricInfo,
  Sparkline,
  chartColors,
  formatCurrencyCompact,
} from "@/components/charts";
import { cn } from "@/lib/cn";
import { ArrowUpDown } from "lucide-react";
import { timeWindowLabel } from "@/core/analytics/timeWindow";
import type { DrilldownEntity, RegionRunRow } from "@/core/analytics/regionalTrends";
import type { EntityKind, Lookups } from "@/constants/regionalConstants";
import type { TimeWindowWeeks } from "@/core/analytics/timeWindow";
import { EntityDetailPanel } from "./EntityDetailPanel";
import { type MetricDef, weeklySeries } from "./regionalMetrics";

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

export function EntityTable({
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

export function CompareCards({
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
