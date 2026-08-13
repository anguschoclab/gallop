/**
 * HorseCareerCharts.tsx - Career-level data viz for the horse profile.
 * Cumulative earnings curve, finish-position distribution, surface strike rate.
 * Presentation only: reads the horse's existing raceHistory.
 */
import { useMemo } from "react";
import { ChartCard, AreaTrend, MiniBar, StackedRatioBar } from "@/components/charts";
import { chartColors, formatCurrencyCompact, formatDay } from "@/components/charts";
import type { Horse } from "@/game/types";

interface HorseCareerChartsProps {
  horse: Horse;
}

export function HorseCareerCharts({ horse }: HorseCareerChartsProps) {
  const history = useMemo(
    () => [...(horse.raceHistory ?? [])].sort((a, b) => a.day - b.day),
    [horse.raceHistory],
  );

  const derived = useMemo(() => {
    let running = 0;
    const earningsCurve = history.map((r) => {
      running += r.purseEarned ?? 0;
      return { x: r.day, y: running };
    });

    const finishBuckets = [0, 0, 0, 0]; // 1st, 2nd, 3rd, 4th+
    const bySurface = new Map<string, { starts: number; wins: number }>();
    const byDistance = new Map<string, { starts: number; wins: number }>();

    for (const r of history) {
      const idx = r.position <= 3 ? r.position - 1 : 3;
      finishBuckets[idx]++;

      const surface = r.surface ?? "Unknown";
      const s = bySurface.get(surface) ?? { starts: 0, wins: 0 };
      s.starts++;
      if (r.position === 1) s.wins++;
      bySurface.set(surface, s);

      const d = r.distance ?? 0;
      const trip = d === 0 ? "Unknown" : d < 1400 ? "Sprint" : d < 2000 ? "Mile/Classic" : "Route";
      const t = byDistance.get(trip) ?? { starts: 0, wins: 0 };
      t.starts++;
      if (r.position === 1) t.wins++;
      byDistance.set(trip, t);
    }

    const toRows = (m: Map<string, { starts: number; wins: number }>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1].starts - a[1].starts)
        .map(([label, v]) => ({
          label,
          value: v.starts ? Math.round((v.wins / v.starts) * 100) : 0,
          hint: `${v.wins}W / ${v.starts} starts`,
        }));

    return {
      earningsCurve,
      total: running,
      finishBuckets,
      surfaceRows: toRows(bySurface),
      tripRows: toRows(byDistance),
    };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="text-[11px] font-mono uppercase tracking-wider text-cream/40">
        No starts yet — career charts appear after the first race.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ChartCard
        title="Cumulative Earnings"
        subtitle={formatCurrencyCompact(derived.total)}
        footnote={history.length === 1 ? "First start only" : `${history.length} starts`}
        info="Prize money this horse has banked, accumulated across its career in race-day order."
        infoFormula="Running total of purse earned per start; x-axis is the in-game day."
        legend={[{ label: "Cumulative earnings", color: chartColors.primary, variant: "line" }]}
        className="md:col-span-2"
      >
        {derived.earningsCurve.length === 1 ? (
          <div className="px-2 py-6 text-center font-mono text-sm text-cream/70">
            {formatCurrencyCompact(derived.total)} from first start (Day{" "}
            {derived.earningsCurve[0].x})
          </div>
        ) : (
          <AreaTrend
            data={derived.earningsCurve}
            height={180}
            yFormat={formatCurrencyCompact}
            xFormat={(x) => formatDay(Number(x))}
          />
        )}
      </ChartCard>

      <ChartCard
        title="Finish Distribution"
        subtitle={`${history.length} starts`}
        info="Share of starts finishing 1st, 2nd, 3rd, or outside the top three."
        infoFormula="starts in each finish bucket ÷ total starts."
        legend={[
          { label: "Win", color: chartColors.primary },
          { label: "2nd", color: chartColors.secondary },
          { label: "3rd", color: chartColors.tertiary },
          { label: "4th+", color: chartColors.slate },
        ]}
      >
        <div className="px-2 pt-2">
          <StackedRatioBar
            segments={[
              { key: "w", label: "Win", value: derived.finishBuckets[0], color: chartColors.primary },
              {
                key: "p",
                label: "2nd",
                value: derived.finishBuckets[1],
                color: chartColors.secondary,
              },
              {
                key: "s",
                label: "3rd",
                value: derived.finishBuckets[2],
                color: chartColors.tertiary,
              },
              {
                key: "o",
                label: "4th+",
                value: derived.finishBuckets[3],
                color: chartColors.slate,
              },
            ]}
          />
        </div>
      </ChartCard>

      <ChartCard
        title="Strike Rate by Surface"
        footnote="Wins as % of starts"
        info="Win rate on each surface. The hint under every bar is the sample size — a 100% bar off one start means little."
        infoFormula="wins on surface ÷ starts on surface (× 100)."
        legend={[{ label: "Strike rate", color: chartColors.primary }]}
      >
        <div className="px-2 pt-2">
          <MiniBar rows={derived.surfaceRows} max={100} format={(n) => `${n}%`} />
        </div>
      </ChartCard>

      <ChartCard
        title="Strike Rate by Trip"
        footnote="Sprint <1400m · Mile <2000m · Route 2000m+"
        info="Win rate by trip length bucket, with starts per bucket shown as the bar hint."
        infoFormula="wins in trip bucket ÷ starts in trip bucket (× 100)."
        legend={[{ label: "Strike rate", color: chartColors.primary }]}
      >
        <div className="px-2 pt-2">
          <MiniBar rows={derived.tripRows} max={100} format={(n) => `${n}%`} />
        </div>
      </ChartCard>
    </div>
  );
}
