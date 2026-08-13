/**
 * RegionalTrendsWidget.tsx - Dashboard regional earnings / G1 trends.
 *
 * Every bar and region row is clickable: it opens a drilldown of the jockeys,
 * trainers and stables behind that region for the selected time window.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import { ChartCard, AreaTrend, MiniBar, chartColors, formatCurrencyCompact } from "@/components/charts";
import { TimeWindowSelect } from "@/components/analytics/TimeWindowSelect";
import { useTimeWindow } from "@/hooks/analytics/useTimeWindow";
import { timeWindowLabel } from "@/core/analytics/timeWindow";
import {
  computeRegionDrilldown,
  computeRegionTrends,
  regionNameFor,
  type RegionKey,
} from "@/core/analytics/regionalTrends";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe2 } from "lucide-react";

export function RegionalTrendsWidget() {
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const races = useGameWithShallow((s: GameState) => s.races);
  const jockeys = useGameWithShallow((s: GameState) => s.jockeys ?? []);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables ?? []);
  const hiredStaff = useGameWithShallow((s: GameState) => s.hiredStaff ?? []);
  const staffPool = useGameWithShallow((s: GameState) => s.staffPool ?? []);
  const stableName = useGameWithShallow((s: GameState) => s.stableName ?? "My Stable");
  const day = useGameWithShallow((s: GameState) => s.day);

  const { weeks } = useTimeWindow();
  const [openRegion, setOpenRegion] = useState<RegionKey | null>(null);

  const rows = useMemo(
    () => computeRegionTrends({ horses, races, currentDay: day, weeks, ownedOnly: true }),
    [horses, races, day, weeks],
  );

  const lookups = useMemo(() => {
    const jockeyNames = new Map((jockeys ?? []).map((j) => [j.id, j.name]));
    const stableNames = new Map<string, string>(npcStables.map((s) => [s.id, s.name]));
    stableNames.set("player", stableName);
    const allStaff = [...hiredStaff, ...staffPool];
    const trainerByStable = new Map<string, { id: string; name: string }>();
    for (const m of allStaff) {
      if (m.role === "trainer" && m.stableId) {
        trainerByStable.set(m.stableId, { id: m.id, name: m.name });
      }
    }
    return { jockeyNames, stableNames, trainerByStable };
  }, [jockeys, npcStables, hiredStaff, staffPool, stableName]);

  const drilldown = useMemo(() => {
    if (!openRegion) return null;
    return computeRegionDrilldown({
      horses,
      races,
      currentDay: day,
      weeks,
      ownedOnly: true,
      region: openRegion,
      ...lookups,
    });
  }, [openRegion, horses, races, day, weeks, lookups]);

  const totals = useMemo(
    () => ({
      earnings: rows.reduce((s, r) => s + r.earnings, 0),
      g1: rows.reduce((s, r) => s + r.g1Top3, 0),
      starts: rows.reduce((s, r) => s + r.starts, 0),
    }),
    [rows],
  );

  const weeklyAll = useMemo(() => {
    const len = rows[0]?.weeklyEarnings.length ?? 0;
    const series: { x: string; y: number }[] = [];
    for (let i = 0; i < len; i++) {
      series.push({
        x: `W-${len - i - 1}`,
        y: rows.reduce((s, r) => s + (r.weeklyEarnings[i] ?? 0), 0),
      });
    }
    return series;
  }, [rows]);

  return (
    <div className="space-y-3 lg:col-span-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-fame" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
            Regional Trends
          </h2>
        </div>
        <TimeWindowSelect />
      </div>

      {totals.starts === 0 ? (
        <div className="rounded-xl border border-white/5 bg-card/40 p-6 text-center text-[11px] font-mono uppercase tracking-wider text-cream/40">
          No starts in the last {timeWindowLabel(weeks)} — regional trends appear after you race.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <ChartCard
            title="Weekly Earnings"
            subtitle={formatCurrencyCompact(totals.earnings)}
            className="md:col-span-2"
            footnote={`All regions · last ${timeWindowLabel(weeks)}`}
            info="Prize money your horses banked, bucketed by week across every region."
            infoFormula="Σ purse earned per run, grouped into 7-day buckets (W-0 = current week)."
            legend={[{ label: "Earnings", color: chartColors.primary, variant: "line" }]}
          >
            <AreaTrend data={weeklyAll} height={170} yFormat={formatCurrencyCompact} />
          </ChartCard>

          <ChartCard
            title="Earnings by Region"
            subtitle={`${totals.g1} G1 top-3`}
            footnote="Click a region to drill into jockeys, trainers and stables"
            info="Each bar is one racing region's share of your prize money in the window. Clicking a bar opens the people and stables behind those runs."
            infoFormula="Region = the region that owns the race's track."
            legend={[
              { label: "Earnings", color: chartColors.primary },
              { label: "G1 top-3", color: chartColors.tertiary, variant: "swatch" },
            ]}
          >
            <ul className="space-y-1 px-2 pt-1">
              {rows.map((r) => (
                <li key={r.region}>
                  <button
                    type="button"
                    onClick={() => setOpenRegion(r.region)}
                    className="w-full rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chart-1)]"
                  >
                    <MiniBar
                      rows={[
                        {
                          label: r.name,
                          value: r.earnings,
                          hint: `${r.starts} starts · ${r.wins}W · ${r.g1Top3} G1 top-3`,
                        },
                      ]}
                      max={rows[0]?.earnings || 1}
                      format={formatCurrencyCompact}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      )}

      <Dialog open={!!openRegion} onOpenChange={(o) => !o && setOpenRegion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-cream">
              {openRegion ? regionNameFor(openRegion) : ""} ·{" "}
              <span className="font-mono text-xs uppercase tracking-wider text-cream/50">
                last {timeWindowLabel(weeks)}
              </span>
            </DialogTitle>
          </DialogHeader>
          {drilldown ? (
            <Tabs defaultValue="jockeys">
              <TabsList>
                <TabsTrigger value="jockeys">Jockeys ({drilldown.jockeys.length})</TabsTrigger>
                <TabsTrigger value="trainers">Trainers ({drilldown.trainers.length})</TabsTrigger>
                <TabsTrigger value="stables">Stables ({drilldown.stables.length})</TabsTrigger>
                <TabsTrigger value="runs">Runs ({drilldown.runs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="jockeys">
                <EntityList
                  rows={drilldown.jockeys}
                  linkFor={(id) => ({ to: "/jockey/$jockeyId", params: { jockeyId: id } })}
                />
              </TabsContent>
              <TabsContent value="trainers">
                <EntityList
                  rows={drilldown.trainers}
                  linkFor={(id) => ({ to: "/staff/$staffId", params: { staffId: id } })}
                />
              </TabsContent>
              <TabsContent value="stables">
                <EntityList
                  rows={drilldown.stables}
                  linkFor={(id) =>
                    id === "player"
                      ? null
                      : { to: "/npc-stables/$stableId", params: { stableId: id } }
                  }
                />
              </TabsContent>
              <TabsContent value="runs">
                <ul className="max-h-[320px] space-y-1 overflow-y-auto pt-2">
                  {drilldown.runs.map((r, i) => (
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
                        {r.isG1 ? " · G1" : ""} ·{" "}
                        {formatCurrencyCompact(r.entry.purseEarned ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EntityListProps {
  rows: { id: string; name: string; starts: number; wins: number; top3: number; earnings: number; g1Top3: number }[];
  linkFor: (id: string) => { to: string; params: Record<string, string> } | null;
}

function EntityList({ rows, linkFor }: EntityListProps) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-[11px] font-mono uppercase tracking-wider text-cream/40">
        Nothing recorded for this region in the selected window.
      </p>
    );
  }
  return (
    <ul className="max-h-[320px] space-y-1 overflow-y-auto pt-2">
      {rows.map((r) => {
        const link = linkFor(r.id);
        const body = (
          <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.03] px-2 py-1.5 text-[11px] hover:bg-white/[0.06]">
            <span className="truncate text-cream/85">{r.name}</span>
            <span className="shrink-0 font-mono tabular-nums text-cream/60">
              {r.starts} starts · {r.wins}W · {r.top3} top-3 · {r.g1Top3} G1 ·{" "}
              {formatCurrencyCompact(r.earnings)}
            </span>
          </div>
        );
        return (
          <li key={r.id}>
            {link ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link to={link.to as any} params={link.params as any} className="block">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
