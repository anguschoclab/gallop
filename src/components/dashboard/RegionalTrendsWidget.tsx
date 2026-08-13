/**
 * RegionalTrendsWidget.tsx - Dashboard regional earnings / G1 trends.
 *
 * Every bar and region row is clickable: it opens a drilldown of the jockeys,
 * trainers and stables behind that region for the selected time window.
 */
import { useMemo, useState } from "react";
import { useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import {
  ChartCard,
  AreaTrend,
  MiniBar,
  chartColors,
  formatCurrencyCompact,
} from "@/components/charts";
import { TimeWindowSelect } from "@/components/analytics/TimeWindowSelect";
import { useTimeWindow } from "@/hooks/analytics/useTimeWindow";
import { timeWindowLabel } from "@/core/analytics/timeWindow";
import {
  computeRegionTrends,
  regionNameFor,
  type RegionKey,
} from "@/core/analytics/regionalTrends";
import { RegionDrilldownDrawer } from "./RegionDrilldownDrawer";
import { Globe2 } from "lucide-react";

export function RegionalTrendsWidget() {
  const horseMap = useGameWithShallow((s: GameState) => s.horses);
  const raceMap = useGameWithShallow((s: GameState) => s.races);
  const jockeys = useGameWithShallow((s: GameState) => s.jockeys ?? []);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables ?? []);
  const hiredStaff = useGameWithShallow((s: GameState) => s.hiredStaff ?? []);
  const staffPool = useGameWithShallow((s: GameState) => s.staffPool ?? []);
  const stableName = useGameWithShallow(
    (s: GameState) => s.playerProfile?.stableName ?? "My Stable",
  );
  const day = useGameWithShallow((s: GameState) => s.day);

  const { weeks } = useTimeWindow();
  const [openRegion, setOpenRegion] = useState<RegionKey | null>(null);

  const horses = useMemo(() => Object.values(horseMap), [horseMap]);
  const races = useMemo(() => Object.values(raceMap), [raceMap]);

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

      <RegionDrilldownDrawer
        region={openRegion}
        onClose={() => setOpenRegion(null)}
        horses={horses}
        races={races}
        currentDay={day}
        weeks={weeks}
        lookups={lookups}
      />
    </div>
  );
}
