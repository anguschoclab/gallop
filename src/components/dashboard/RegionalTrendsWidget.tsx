/**
 * RegionalTrendsWidget.tsx - Dashboard regional performance trends: earnings and
 * Grade 1 finish counts per region over the last N weeks.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaTrend, ChartCard, MiniBar, chartColors, formatCurrencyCompact } from "@/components/charts";
import { useGameWithShallow } from "@/game/store";
import { regionForTrack } from "@/core/calendar/trackRegion";
import type { GameState } from "@/game/types";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/cn";

const RANGES = [4, 8, 12];

export function RegionalTrendsWidget() {
  const { day, horses, races } = useGameWithShallow((s: GameState) => ({
    day: s.day,
    horses: s.horses,
    races: s.races,
  }));
  const [weeks, setWeeks] = useState(8);

  const derived = useMemo(() => {
    const since = day - weeks * 7;
    const earningsByRegion = new Map<string, number>();
    const g1ByRegion = new Map<string, number>();
    const weekly = new Map<number, number>();

    for (const h of Object.values(horses)) {
      if (h.stableId !== "player") continue;
      for (const r of h.raceHistory ?? []) {
        if (r.day < since || r.day > day) continue;
        const race = races[r.raceId];
        const track = race?.graded?.track ?? race?.graded_override?.track;
        const region = regionForTrack(track);
        const label = region?.name ?? "Unclassified";

        earningsByRegion.set(label, (earningsByRegion.get(label) ?? 0) + (r.purseEarned ?? 0));
        if ((r.grade ?? race?.graded?.grade) === "G1" && r.position <= 3) {
          g1ByRegion.set(label, (g1ByRegion.get(label) ?? 0) + 1);
        }

        const week = Math.floor((r.day - since) / 7);
        weekly.set(week, (weekly.get(week) ?? 0) + (r.purseEarned ?? 0));
      }
    }

    const earningsRows = Array.from(earningsByRegion.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value, color: chartColors.primary }));

    const g1Rows = Array.from(g1ByRegion.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value, color: chartColors.secondary }));

    const trend = Array.from({ length: weeks }, (_, i) => ({
      x: `W${i + 1}`,
      y: weekly.get(i) ?? 0,
    }));

    const total = Array.from(earningsByRegion.values()).reduce((s, v) => s + v, 0);

    return { earningsRows, g1Rows, trend, total };
  }, [day, horses, races, weeks]);

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl lg:col-span-12">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-cream">
          <Globe2 className="h-4 w-4 text-fame" />
          Regional Trends
        </CardTitle>
        <div className="flex items-center gap-1">
          {RANGES.map((w) => (
            <Button
              key={w}
              size="sm"
              variant="ghost"
              onClick={() => setWeeks(w)}
              className={cn(
                "h-6 px-2 font-mono text-[10px] uppercase tracking-widest",
                weeks === w ? "text-gold bg-gold/10" : "text-cream/40",
              )}
            >
              {w}W
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {derived.total === 0 && derived.g1Rows.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-cream/50">
            No runs in the last {weeks} weeks.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <ChartCard
              title="Earnings Trend"
              subtitle={formatCurrencyCompact(derived.total)}
              footnote={`Prize money per week, last ${weeks} weeks`}
            >
              <div className="px-2 pt-2">
                <AreaTrend
                  data={derived.trend}
                  height={140}
                  yFormat={formatCurrencyCompact}
                  xFormat={(x) => String(x)}
                />
              </div>
            </ChartCard>
            <ChartCard title="Earnings by Region" footnote="Prize money won">
              <div className="px-2 pt-2">
                <MiniBar rows={derived.earningsRows} format={formatCurrencyCompact} />
              </div>
            </ChartCard>
            <ChartCard title="Grade 1 Top-3 Finishes" footnote="By region">
              <div className="px-2 pt-2">
                {derived.g1Rows.length ? (
                  <MiniBar rows={derived.g1Rows} />
                ) : (
                  <div className="py-4 text-center font-mono text-[11px] text-cream/50">
                    No Grade 1 placings yet.
                  </div>
                )}
              </div>
            </ChartCard>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
