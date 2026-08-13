/**
 * RegionDrilldownDrawer.tsx - Right-hand drawer with the people and stables
 * behind one region's runs.
 *
 * Two modes:
 *  - Single window: sortable table of jockeys / trainers / stables + runs log.
 *  - Compare: two "last N weeks" windows side by side with per-metric deltas.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DeltaPill, formatCurrencyCompact } from "@/components/charts";
import { cn } from "@/lib/cn";
import {
  TIME_WINDOW_OPTIONS,
  timeWindowLabel,
  type TimeWindowWeeks,
} from "@/core/analytics/timeWindow";
import {
  computeRegionDrilldown,
  regionNameFor,
  type DrilldownEntity,
  type RegionKey,
} from "@/core/analytics/regionalTrends";
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";

type EntityKind = "jockeys" | "trainers" | "stables";

type SortKey = "name" | "starts" | "wins" | "top3" | "g1Top3" | "earnings" | "winPct";

interface Lookups {
  jockeyNames: Map<string, string>;
  stableNames: Map<string, string>;
  trainerByStable: Map<string, { id: string; name: string }>;
}

interface RegionDrilldownDrawerProps {
  region: RegionKey | null;
  onClose: () => void;
  horses: Horse[];
  races: Race[];
  currentDay: number;
  /** The globally selected window; used as the primary/left window. */
  weeks: TimeWindowWeeks;
  lookups: Lookups;
}

const winPct = (e: DrilldownEntity) => (e.starts ? e.wins / e.starts : 0);

const SORTERS: Record<SortKey, (a: DrilldownEntity, b: DrilldownEntity) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  starts: (a, b) => b.starts - a.starts,
  wins: (a, b) => b.wins - a.wins,
  top3: (a, b) => b.top3 - a.top3,
  g1Top3: (a, b) => b.g1Top3 - a.g1Top3,
  earnings: (a, b) => b.earnings - a.earnings,
  winPct: (a, b) => winPct(b) - winPct(a),
};

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "starts", label: "Starts", numeric: true },
  { key: "wins", label: "Wins", numeric: true },
  { key: "winPct", label: "Win %", numeric: true },
  { key: "top3", label: "Top 3", numeric: true },
  { key: "g1Top3", label: "G1 top-3", numeric: true },
  { key: "earnings", label: "Earnings", numeric: true },
];

function linkFor(
  kind: EntityKind,
  id: string,
): { to: string; params: Record<string, string> } | null {
  if (kind === "jockeys") return { to: "/jockey/$jockeyId", params: { jockeyId: id } };
  if (kind === "trainers") return { to: "/staff/$staffId", params: { staffId: id } };
  if (id === "player") return null;
  return { to: "/npc-stables/$stableId", params: { stableId: id } };
}

export function RegionDrilldownDrawer({
  region,
  onClose,
  horses,
  races,
  currentDay,
  weeks,
  lookups,
}: RegionDrilldownDrawerProps) {
  const [kind, setKind] = useState<EntityKind | "runs">("jockeys");
  const [sortKey, setSortKey] = useState<SortKey>("earnings");
  const [sortDesc, setSortDesc] = useState(true);
  const [compare, setCompare] = useState(false);
  const [weeksA, setWeeksA] = useState<TimeWindowWeeks>(weeks);
  const [weeksB, setWeeksB] = useState<TimeWindowWeeks>(4);

  const base = {
    horses,
    races,
    currentDay,
    ownedOnly: true,
    region: region ?? "other",
    ...lookups,
  };

  const primary = useMemo(
    () => (region ? computeRegionDrilldown({ ...base, weeks: compare ? weeksA : weeks }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, horses, races, currentDay, lookups, compare, weeksA, weeks],
  );

  const secondary = useMemo(
    () => (region && compare ? computeRegionDrilldown({ ...base, weeks: weeksB }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, horses, races, currentDay, lookups, compare, weeksB],
  );

  const entityRows = useMemo(() => {
    if (!primary || kind === "runs") return [];
    const rows = [...primary[kind]];
    const sorter = SORTERS[sortKey];
    rows.sort((a, b) => (sortDesc ? sorter(a, b) : -sorter(a, b)));
    return rows;
  }, [primary, kind, sortKey, sortDesc]);

  const compareRows = useMemo(() => {
    if (!compare || !primary || !secondary || kind === "runs") return [];
    const byId = new Map<string, { a?: DrilldownEntity; b?: DrilldownEntity; name: string }>();
    for (const e of primary[kind]) byId.set(e.id, { a: e, name: e.name });
    for (const e of secondary[kind]) {
      const prev = byId.get(e.id);
      if (prev) prev.b = e;
      else byId.set(e.id, { b: e, name: e.name });
    }
    const empty: DrilldownEntity = {
      id: "",
      name: "",
      starts: 0,
      wins: 0,
      top3: 0,
      earnings: 0,
      g1Top3: 0,
    };
    const rows = Array.from(byId.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      a: v.a ?? empty,
      b: v.b ?? empty,
    }));
    const sorter = SORTERS[sortKey];
    rows.sort((x, y) => (sortDesc ? sorter(x.a, y.a) : -sorter(x.a, y.a)));
    return rows;
  }, [compare, primary, secondary, kind, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(key !== "name");
    }
  };

  const headerCell = (col: { key: SortKey; label: string; numeric?: boolean }) => (
    <th
      key={col.key}
      scope="col"
      className={cn(
        "px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-cream/40",
        col.numeric ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => toggleSort(col.key)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-cream",
          sortKey === col.key && "text-cream",
        )}
      >
        {col.label}
        {sortKey === col.key ? (
          sortDesc ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );

  return (
    <Sheet open={!!region} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="text-cream">
            {region ? regionNameFor(region) : ""}{" "}
            <span className="font-mono text-xs uppercase tracking-wider text-cream/50">
              {compare
                ? `${timeWindowLabel(weeksA)} vs ${timeWindowLabel(weeksB)}`
                : `last ${timeWindowLabel(weeks)}`}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Tabs value={kind} onValueChange={(v) => setKind(v as EntityKind | "runs")}>
            <TabsList>
              <TabsTrigger value="jockeys">Jockeys</TabsTrigger>
              <TabsTrigger value="trainers">Trainers</TabsTrigger>
              <TabsTrigger value="stables">Stables</TabsTrigger>
              <TabsTrigger value="runs">Runs</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant={compare ? "default" : "ghost"}
            size="sm"
            onClick={() => setCompare((c) => !c)}
          >
            {compare ? "Comparing" : "Compare windows"}
          </Button>
        </div>

        {compare && kind !== "runs" ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <WindowPicker label="Window A" value={weeksA} onChange={setWeeksA} />
            <WindowPicker label="Window B" value={weeksB} onChange={setWeeksB} />
          </div>
        ) : null}

        <div className="mt-3">
          {kind === "runs" ? (
            <RunsList runs={primary?.runs ?? []} />
          ) : compare ? (
            compareRows.length === 0 ? (
              <EmptyNote />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {headerCell(COLUMNS[0]!)}
                      {COLUMNS.slice(1).map((c) => headerCell(c))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.id} className="border-b border-white/5">
                        <td className="max-w-[160px] truncate px-2 py-1.5 text-cream/85">
                          {row.name}
                        </td>
                        <CompareCell a={row.a.starts} b={row.b.starts} />
                        <CompareCell a={row.a.wins} b={row.b.wins} />
                        <CompareCell
                          a={winPct(row.a)}
                          b={winPct(row.b)}
                          format={(v) => `${(v * 100).toFixed(0)}%`}
                          percentDelta
                        />
                        <CompareCell a={row.a.top3} b={row.b.top3} />
                        <CompareCell a={row.a.g1Top3} b={row.b.g1Top3} />
                        <CompareCell
                          a={row.a.earnings}
                          b={row.b.earnings}
                          format={formatCurrencyCompact}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-cream/35">
                  Top value = window A ({timeWindowLabel(weeksA)}), below = window B (
                  {timeWindowLabel(weeksB)}), pill = A − B.
                </p>
              </div>
            )
          ) : entityRows.length === 0 ? (
            <EmptyNote />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/5">{COLUMNS.map((c) => headerCell(c))}</tr>
                </thead>
                <tbody>
                  {entityRows.map((e) => {
                    const link = linkFor(kind, e.id);
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="max-w-[180px] truncate px-2 py-1.5 text-cream/85">
                          {link ? (
                            <Link
                              to={link.to as any}

                              params={link.params as any}
                              className="hover:text-gold"
                            >
                              {e.name}
                            </Link>
                          ) : (
                            e.name
                          )}
                        </td>
                        <Num>{e.starts}</Num>
                        <Num>{e.wins}</Num>
                        <Num>{`${(winPct(e) * 100).toFixed(0)}%`}</Num>
                        <Num>{e.top3}</Num>
                        <Num>{e.g1Top3}</Num>
                        <Num>{formatCurrencyCompact(e.earnings)}</Num>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-cream/70">{children}</td>
  );
}

function CompareCell({
  a,
  b,
  format,
  percentDelta,
}: {
  a: number;
  b: number;
  format?: (v: number) => string;
  percentDelta?: boolean;
}) {
  const fmt = format ?? ((v: number) => v.toLocaleString());
  return (
    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
      <div className="text-cream/80">{fmt(a)}</div>
      <div className="text-cream/40">{fmt(b)}</div>
      <DeltaPill value={percentDelta ? a - b : a - b} asPercent={percentDelta} className="mt-0.5" />
    </td>
  );
}

function WindowPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TimeWindowWeeks;
  onChange: (w: TimeWindowWeeks) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cream/40">
        {label}
      </span>
      <div
        role="group"
        aria-label={label}
        className="flex items-center gap-0.5 rounded-md border border-white/5 bg-black/20 p-0.5"
      >
        {TIME_WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
              value === opt.value
                ? "bg-[color-mix(in_oklab,var(--chart-1)_25%,transparent)] text-cream"
                : "text-cream/45 hover:text-cream/80",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyNote() {
  return (
    <p className="py-8 text-center text-[11px] font-mono uppercase tracking-wider text-cream/40">
      Nothing recorded for this region in the selected window.
    </p>
  );
}

function RunsList({
  runs,
}: {
  runs: { horseId: string; horseName: string; isG1: boolean; entry: Record<string, any> }[];
}) {
  if (runs.length === 0) return <EmptyNote />;
  return (
    <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
      {runs.map((r, i) => (
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
  );
}
