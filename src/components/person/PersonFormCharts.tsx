/**
 * PersonFormCharts.tsx - Data viz for a person's (jockey/trainer/owner) race record.
 * Win-rate mix (class / surface / trip), rolling profitability, finish split, and
 * expected-vs-actual finish distribution. Scoped by the shared analytics window.
 */
import { useMemo } from "react";
import { ChartCard, MiniBar, Sparkline, StackedRatioBar, AreaTrend } from "@/components/charts";
import { chartColors, formatCurrencyCompact, formatDay } from "@/components/charts";
import { TimeWindowSelect } from "@/components/analytics/TimeWindowSelect";
import { useTimeWindow } from "@/hooks/analytics/useTimeWindow";
import { filterByWindow, timeWindowLabel } from "@/core/analytics/timeWindow";
import { useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import type { HorseRaceHistoryEntry } from "@/core/horse/types";

interface PersonFormChartsProps {
  entries: HorseRaceHistoryEntry[];
}

function tripBucket(distance?: number): string {
  if (!distance) return "Unknown";
  if (distance < 1400) return "Sprint";
  if (distance < 2000) return "Mile/Classic";
  return "Route";
}

export function PersonFormCharts({ entries }: PersonFormChartsProps) {
  const day = useGameWithShallow((s: GameState) => s.day);
  const { weeks } = useTimeWindow();

  const derived = useMemo(() => {
    const rides = filterByWindow([...entries], day, weeks).sort((a, b) => a.day - b.day);

    // Rolling 10-ride win percentage
    const window = 10;
    const rolling: number[] = [];
    // Rolling return per run: prize money banked / rides, over the same 10-ride window
    const profitability: { x: number; y: number }[] = [];
    for (let i = 0; i < rides.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = rides.slice(start, i + 1);
      const wins = slice.filter((r) => r.position === 1).length;
      rolling.push(Math.round((wins / slice.length) * 100));
      const earned = slice.reduce((s, r) => s + (r.purseEarned ?? 0), 0);
      profitability.push({ x: rides[i].day, y: Math.round(earned / slice.length) });
    }

    const finish = [0, 0, 0, 0];
    const byGrade = new Map<string, { starts: number; wins: number }>();
    const bySurface = new Map<string, { starts: number; wins: number }>();
    const byTrip = new Map<string, { starts: number; wins: number }>();

    // Expected vs actual: expected chance of each finish bucket is 1/fieldSize per slot.
    let expectedWin = 0;
    let expectedTop3 = 0;
    for (const r of rides) {
      finish[r.position <= 3 ? r.position - 1 : 3]++;
      const bump = (m: Map<string, { starts: number; wins: number }>, key: string) => {
        const g = m.get(key) ?? { starts: 0, wins: 0 };
        g.starts++;
        if (r.position === 1) g.wins++;
        m.set(key, g);
      };
      bump(byGrade, r.grade ?? r.raceClass ?? "Ungraded");
      bump(bySurface, r.surface ?? "Unknown");
      bump(byTrip, tripBucket(r.distance));

      const field = Math.max(2, r.fieldSize ?? 10);
      expectedWin += 1 / field;
      expectedTop3 += Math.min(1, 3 / field);
    }

    const toRows = (m: Map<string, { starts: number; wins: number }>, limit = 6) =>
      Array.from(m.entries())
        .sort((a, b) => b[1].starts - a[1].starts)
        .slice(0, limit)
        .map(([label, v]) => ({
          label,
          value: Math.round((v.wins / v.starts) * 100),
          hint: `${v.wins}W / ${v.starts} starts`,
        }));

    const starts = rides.length;
    return {
      starts,
      rolling,
      profitability,
      finish,
      gradeRows: toRows(byGrade),
      surfaceRows: toRows(bySurface),
      tripRows: toRows(byTrip),
      latest: rolling[rolling.length - 1] ?? 0,
      latestReturn: profitability[profitability.length - 1]?.y ?? 0,
      expected: {
        winPct: starts ? Math.round((expectedWin / starts) * 100) : 0,
        top3Pct: starts ? Math.round((expectedTop3 / starts) * 100) : 0,
      },
      actual: {
        winPct: starts ? Math.round((finish[0] / starts) * 100) : 0,
        top3Pct: starts ? Math.round(((finish[0] + finish[1] + finish[2]) / starts) * 100) : 0,
      },
    };
  }, [entries, day, weeks]);

  if (entries.length === 0) return null;

  const windowText = `Last ${timeWindowLabel(weeks)} · ${derived.starts} starts`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cream/40">
          {windowText}
        </span>
        <TimeWindowSelect />
      </div>

      {derived.starts === 0 ? (
        <div className="rounded-xl border border-white/5 bg-card/40 p-6 text-center text-[11px] font-mono uppercase tracking-wider text-cream/40">
          No starts inside the selected window.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <ChartCard
            title="Form Trend"
            subtitle={`${derived.latest}%`}
            footnote="Rolling 10-start win rate"
            info="Win rate over the 10 most recent starts at each point in time — a rising line means recent form is improving."
            infoFormula="wins in last 10 starts ÷ starts in last 10 (× 100)."
            legend={[{ label: "Win % (10-start)", color: chartColors.primary, variant: "line" }]}
          >
            {derived.rolling.length < 2 ? (
              <div className="px-2 py-5 text-center font-mono text-xs text-cream/60">
                Single start in window
              </div>
            ) : (
              <div className="px-2 pt-2">
                <Sparkline data={derived.rolling} height={72} />
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Rolling Profitability"
            subtitle={formatCurrencyCompact(derived.latestReturn)}
            footnote="Prize money returned per run"
            info="Average prize money banked per start, smoothed over the last 10 starts. Higher means each ride is paying more."
            infoFormula="Σ purse earned (last 10 starts) ÷ number of those starts."
            legend={[
              { label: "Return per run", color: chartColors.secondary, variant: "line" },
            ]}
          >
            {derived.profitability.length < 2 ? (
              <div className="px-2 py-5 text-center font-mono text-xs text-cream/60">
                Needs two starts in window
              </div>
            ) : (
              <AreaTrend
                data={derived.profitability}
                color={chartColors.secondary}
                height={100}
                yFormat={formatCurrencyCompact}
                xFormat={(x) => formatDay(Number(x))}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Finish Split"
            subtitle={`${derived.starts} starts`}
            info="Share of starts that finished 1st, 2nd, 3rd, or outside the top three."
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
                  { key: "w", label: "Win", value: derived.finish[0], color: chartColors.primary },
                  { key: "p", label: "2nd", value: derived.finish[1], color: chartColors.secondary },
                  { key: "s", label: "3rd", value: derived.finish[2], color: chartColors.tertiary },
                  { key: "o", label: "4th+", value: derived.finish[3], color: chartColors.slate },
                ]}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Win-Rate Mix · Class"
            footnote="Wins as % of starts in that class"
            info="Strike rate split by race class or grade. Each bar's hint shows the sample size behind it — treat bars with few starts as noise."
            infoFormula="wins in class ÷ starts in class (× 100)."
            legend={[{ label: "Strike rate", color: chartColors.primary }]}
          >
            <div className="px-2 pt-2">
              <MiniBar rows={derived.gradeRows} max={100} format={(n) => `${n}%`} />
            </div>
          </ChartCard>

          <ChartCard
            title="Win-Rate Mix · Surface"
            footnote="Wins as % of starts on that surface"
            info="Strike rate split by track surface, with starts shown per bar."
            infoFormula="wins on surface ÷ starts on surface (× 100)."
            legend={[{ label: "Strike rate", color: chartColors.primary }]}
          >
            <div className="px-2 pt-2">
              <MiniBar rows={derived.surfaceRows} max={100} format={(n) => `${n}%`} />
            </div>
          </ChartCard>

          <ChartCard
            title="Expected vs Actual"
            footnote="Sprint <1400m · Mile <2000m · Route 2000m+"
            info="Actual results against what pure chance would produce given field sizes. Bars above the expected line mean out-performance."
            infoFormula="Expected win % = mean(1 ÷ field size); expected top-3 % = mean(3 ÷ field size)."
            legend={[
              { label: "Actual", color: chartColors.primary },
              { label: "Expected (chance)", color: chartColors.slate },
            ]}
          >
            <div className="space-y-2 px-2 pt-2">
              <MiniBar
                rows={[
                  { label: "Win % actual", value: derived.actual.winPct },
                  {
                    label: "Win % expected",
                    value: derived.expected.winPct,
                    color: chartColors.slate,
                  },
                  { label: "Top-3 % actual", value: derived.actual.top3Pct },
                  {
                    label: "Top-3 % expected",
                    value: derived.expected.top3Pct,
                    color: chartColors.slate,
                  },
                ]}
                max={100}
                format={(n) => `${n}%`}
              />
              <MiniBar rows={derived.tripRows} max={100} format={(n) => `${n}%`} />
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
