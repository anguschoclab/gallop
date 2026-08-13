/**
 * StableSplitAnalytics.tsx - Stable-wide race split analytics: finish splits and
 * strike rates compared across trip ranges and surfaces.
 */
import { useMemo } from "react";
import { ChartCard, MiniBar, StackedRatioBar, chartColors } from "@/components/charts";
import { DISTANCE_LABEL, distanceBucket } from "@/core/horse/paceTendency";
import type { Horse } from "@/game/types";

interface StableSplitAnalyticsProps {
  horses: Horse[];
  title?: string;
}

interface Split {
  starts: number;
  wins: number;
  places: number;
  shows: number;
}

const EMPTY = (): Split => ({ starts: 0, wins: 0, places: 0, shows: 0 });

export function StableSplitAnalytics({ horses, title }: StableSplitAnalyticsProps) {
  const derived = useMemo(() => {
    const byTrip = new Map<string, Split>();
    const bySurface = new Map<string, Split>();
    let total = 0;

    for (const h of horses) {
      for (const r of h.raceHistory ?? []) {
        total++;
        const bucket = distanceBucket(r.distance);
        const tripKey = bucket === "any" ? "Unknown Trip" : DISTANCE_LABEL[bucket];
        const surfaceKey = r.surface ?? "Unknown";
        for (const [map, key] of [
          [byTrip, tripKey],
          [bySurface, surfaceKey],
        ] as [Map<string, Split>, string][]) {
          const s = map.get(key) ?? EMPTY();
          s.starts++;
          if (r.position === 1) s.wins++;
          else if (r.position === 2) s.places++;
          else if (r.position === 3) s.shows++;
          map.set(key, s);
        }
      }
    }

    const strikeRows = (m: Map<string, Split>, color: string) =>
      Array.from(m.entries())
        .sort((a, b) => b[1].starts - a[1].starts)
        .map(([label, s]) => ({
          label,
          value: Math.round((s.wins / Math.max(1, s.starts)) * 100),
          hint: `${s.wins}W / ${s.starts} starts`,
          color,
        }));

    const splitSegments = (s: Split) => [
      { key: "w", label: "Win", value: s.wins, color: chartColors.primary },
      { key: "p", label: "2nd", value: s.places, color: chartColors.secondary },
      { key: "s", label: "3rd", value: s.shows, color: chartColors.tertiary },
      {
        key: "o",
        label: "4th+",
        value: s.starts - s.wins - s.places - s.shows,
        color: chartColors.slate,
      },
    ];

    return {
      total,
      tripStrike: strikeRows(byTrip, chartColors.primary),
      surfaceStrike: strikeRows(bySurface, chartColors.secondary),
      tripSplits: Array.from(byTrip.entries())
        .sort((a, b) => b[1].starts - a[1].starts)
        .map(([label, s]) => ({ label, starts: s.starts, segments: splitSegments(s) })),
      surfaceSplits: Array.from(bySurface.entries())
        .sort((a, b) => b[1].starts - a[1].starts)
        .map(([label, s]) => ({ label, starts: s.starts, segments: splitSegments(s) })),
    };
  }, [horses]);

  if (derived.total === 0) return null;

  return (
    <div className="space-y-3">
      {title ? (
        <div className="text-[10px] font-black uppercase tracking-widest text-fame/40">{title}</div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <ChartCard
          title="Strike Rate by Trip"
          subtitle={`${derived.total} starts`}
          footnote="Wins as % of starts"
        >
          <div className="px-2 pt-2">
            <MiniBar rows={derived.tripStrike} max={100} format={(n) => `${n}%`} />
          </div>
        </ChartCard>
        <ChartCard title="Strike Rate by Surface" footnote="Wins as % of starts">
          <div className="px-2 pt-2">
            <MiniBar rows={derived.surfaceStrike} max={100} format={(n) => `${n}%`} />
          </div>
        </ChartCard>
        <ChartCard title="Finish Split by Trip" footnote="Share of finishes per trip range">
          <div className="space-y-3 px-2 pt-2">
            {derived.tripSplits.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-baseline justify-between font-mono text-[9px] uppercase tracking-wider text-cream/35">
                  <span>{row.label}</span>
                  <span className="tabular-nums">{row.starts} starts</span>
                </div>
                <StackedRatioBar segments={row.segments} />
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Finish Split by Surface" footnote="Share of finishes per surface">
          <div className="space-y-3 px-2 pt-2">
            {derived.surfaceSplits.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-baseline justify-between font-mono text-[9px] uppercase tracking-wider text-cream/35">
                  <span>{row.label}</span>
                  <span className="tabular-nums">{row.starts} starts</span>
                </div>
                <StackedRatioBar segments={row.segments} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
