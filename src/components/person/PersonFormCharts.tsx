/**
 * PersonFormCharts.tsx - Data viz for a person's (jockey/trainer/owner) race record.
 * Rolling strike-rate trend, finish split, and strike rate by grade.
 */
import { useMemo } from "react";
import { ChartCard, MiniBar, Sparkline, StackedRatioBar } from "@/components/charts";
import { chartColors } from "@/components/charts";
import type { HorseRaceHistoryEntry } from "@/core/horse/types";

interface PersonFormChartsProps {
  entries: HorseRaceHistoryEntry[];
}

export function PersonFormCharts({ entries }: PersonFormChartsProps) {
  const derived = useMemo(() => {
    const rides = [...entries].sort((a, b) => a.day - b.day);

    // Rolling 10-ride win percentage
    const window = 10;
    const rolling: number[] = [];
    for (let i = 0; i < rides.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = rides.slice(start, i + 1);
      const wins = slice.filter((r) => r.position === 1).length;
      rolling.push(Math.round((wins / slice.length) * 100));
    }

    const finish = [0, 0, 0, 0];
    const byGrade = new Map<string, { starts: number; wins: number }>();
    for (const r of rides) {
      finish[r.position <= 3 ? r.position - 1 : 3]++;
      const key = r.grade ?? r.raceClass ?? "Ungraded";
      const g = byGrade.get(key) ?? { starts: 0, wins: 0 };
      g.starts++;
      if (r.position === 1) g.wins++;
      byGrade.set(key, g);
    }

    const gradeRows = Array.from(byGrade.entries())
      .sort((a, b) => b[1].starts - a[1].starts)
      .slice(0, 6)
      .map(([label, v]) => ({
        label,
        value: Math.round((v.wins / v.starts) * 100),
        hint: `${v.wins}W / ${v.starts} starts`,
      }));

    return { rolling, finish, gradeRows, latest: rolling[rolling.length - 1] ?? 0 };
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ChartCard
        title="Form Trend"
        subtitle={`${derived.latest}%`}
        footnote="Rolling 10-start win rate"
      >
        {derived.rolling.length < 2 ? (
          <div className="px-2 py-5 text-center font-mono text-xs text-cream/60">
            Single start so far
          </div>
        ) : (
          <div className="px-2 pt-2">
            <Sparkline data={derived.rolling} height={72} />
          </div>
        )}
      </ChartCard>

      <ChartCard title="Finish Split" subtitle={`${entries.length} starts`}>
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

      <ChartCard title="Strike Rate by Class" footnote="Wins as % of starts">
        <div className="px-2 pt-2">
          <MiniBar rows={derived.gradeRows} max={100} format={(n) => `${n}%`} />
        </div>
      </ChartCard>
    </div>
  );
}
