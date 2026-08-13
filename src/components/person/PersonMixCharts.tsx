/**
 * PersonMixCharts.tsx - Win-rate mix (class / surface / trip) and rolling
 * prize-money-per-run trend for a jockey or trainer.
 */
import { useMemo } from "react";
import { AreaTrend, ChartCard, MiniBar, chartColors, formatCurrencyCompact } from "@/components/charts";
import { DISTANCE_LABEL, distanceBucket } from "@/core/horse/paceTendency";
import type { HorseRaceHistoryEntry } from "@/core/horse/types";

interface PersonMixChartsProps {
  entries: HorseRaceHistoryEntry[];
  /** Rolling window for the profitability trend. */
  window?: number;
}

interface Bucket {
  starts: number;
  wins: number;
}

function toRows(map: Map<string, Bucket>, color: string, limit = 6) {
  return Array.from(map.entries())
    .sort((a, b) => b[1].starts - a[1].starts)
    .slice(0, limit)
    .map(([label, v]) => ({
      label,
      value: Math.round((v.wins / Math.max(1, v.starts)) * 100),
      hint: `${v.wins}W / ${v.starts} starts`,
      color,
    }));
}

export function PersonMixCharts({ entries, window = 10 }: PersonMixChartsProps) {
  const derived = useMemo(() => {
    const runs = [...entries].sort((a, b) => a.day - b.day);

    const byClass = new Map<string, Bucket>();
    const bySurface = new Map<string, Bucket>();
    const byTrip = new Map<string, Bucket>();

    const add = (m: Map<string, Bucket>, key: string, won: boolean) => {
      const b = m.get(key) ?? { starts: 0, wins: 0 };
      b.starts++;
      if (won) b.wins++;
      m.set(key, b);
    };

    for (const r of runs) {
      const won = r.position === 1;
      add(byClass, r.grade ?? r.raceClass ?? "Ungraded", won);
      add(bySurface, r.surface ?? "Unknown", won);
      const bucket = distanceBucket(r.distance);
      add(byTrip, bucket === "any" ? "Unknown Trip" : DISTANCE_LABEL[bucket], won);
    }

    // Rolling prize money generated per run
    const trend = runs.map((r, i) => {
      const slice = runs.slice(Math.max(0, i - window + 1), i + 1);
      const total = slice.reduce((s, x) => s + (x.purseEarned ?? 0), 0);
      return { x: r.day, y: Math.round(total / slice.length) };
    });

    const latest = trend.length ? trend[trend.length - 1].y : 0;

    return {
      classRows: toRows(byClass, chartColors.primary),
      surfaceRows: toRows(bySurface, chartColors.secondary, 4),
      tripRows: toRows(byTrip, chartColors.tertiary, 4),
      trend,
      latest,
    };
  }, [entries, window]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <ChartCard title="Strike Rate by Class" footnote="Wins as % of starts">
          <div className="px-2 pt-2">
            <MiniBar rows={derived.classRows} max={100} format={(n) => `${n}%`} />
          </div>
        </ChartCard>
        <ChartCard title="Strike Rate by Surface" footnote="Wins as % of starts">
          <div className="px-2 pt-2">
            <MiniBar rows={derived.surfaceRows} max={100} format={(n) => `${n}%`} />
          </div>
        </ChartCard>
        <ChartCard title="Strike Rate by Trip" footnote="Wins as % of starts">
          <div className="px-2 pt-2">
            <MiniBar rows={derived.tripRows} max={100} format={(n) => `${n}%`} />
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Rolling Return per Run"
        subtitle={formatCurrencyCompact(derived.latest)}
        footnote={`Rolling ${window}-run average prize money generated`}
      >
        {derived.trend.length < 2 ? (
          <div className="px-2 py-5 text-center font-mono text-xs text-cream/60">
            Single run so far
          </div>
        ) : (
          <div className="px-2 pt-2">
            <AreaTrend
              data={derived.trend}
              height={140}
              yFormat={formatCurrencyCompact}
              xFormat={(x) => `D${x}`}
            />

          </div>
        )}
      </ChartCard>
    </div>
  );
}
