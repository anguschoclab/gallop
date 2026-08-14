/**
 * NpcStableCharts.tsx - Data viz for an NPC stable's roster and record.
 * Top earners, roster age spread, and graded record split.
 */
import { useMemo } from "react";
import { ChartCard, MiniBar, StackedRatioBar } from "@/components/charts";
import { chartColors, formatCurrencyCompact } from "@/components/charts";
import { getCareerStats } from "@/core/horse/stats";
import type { Horse } from "@/game/types";

interface NpcStableChartsProps {
  horses: Horse[];
  headToHead: { wins: number; losses: number };
}

export function NpcStableCharts({ horses, headToHead }: NpcStableChartsProps) {
  const derived = useMemo(() => {
    const stats = horses.map((h) => ({ horse: h, career: getCareerStats(h) }));

    const topEarners = [...stats]
      .sort((a, b) => b.career.earnings - a.career.earnings)
      .slice(0, 5)
      .filter((s) => s.career.earnings > 0)
      .map((s) => ({
        label: s.horse.name,
        value: s.career.earnings,
        hint: `${s.career.wins}W / ${s.career.starts} starts`,
      }));

    const ageBuckets = new Map<string, number>();
    for (const h of horses) {
      const label = h.age <= 1 ? "Foal/Yearling" : `${h.age}yo`;
      ageBuckets.set(label, (ageBuckets.get(label) ?? 0) + 1);
    }
    const ageRows = Array.from(ageBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value, color: chartColors.secondary }));

    let wins = 0;
    let places = 0;
    let shows = 0;
    let other = 0;
    for (const s of stats) {
      wins += s.career.wins;
      places += s.career.places;
      shows += s.career.shows;
      other += s.career.starts - s.career.wins - s.career.places - s.career.shows;
    }

    return { topEarners, ageRows, record: { wins, places, shows, other } };
  }, [horses]);

  if (horses.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ChartCard
        title="Top Earners"
        footnote="Career prize money"
        info="The five highest career earners on this roster; bar length is prize money, the hint is wins over starts."
        infoFormula="Σ purse earned across all career starts."
        legend={[{ label: "Career earnings", color: chartColors.primary }]}
      >
        <div className="px-2 pt-2">
          {derived.topEarners.length ? (
            <MiniBar rows={derived.topEarners} format={formatCurrencyCompact} />
          ) : (
            <div className="py-5 text-center font-mono text-xs text-cream/50">No earnings yet</div>
          )}
        </div>
      </ChartCard>

      <ChartCard title="Roster Age Spread" subtitle={`${horses.length} head`}>
        <div className="px-2 pt-2">
          <MiniBar rows={derived.ageRows} />
        </div>
      </ChartCard>

      <ChartCard
        title="Stable Record"
        footnote={`Head-to-head vs you: ${headToHead.wins}-${headToHead.losses}`}
      >
        <div className="px-2 pt-2">
          <StackedRatioBar
            segments={[
              { key: "w", label: "Win", value: derived.record.wins, color: chartColors.primary },
              {
                key: "p",
                label: "2nd",
                value: derived.record.places,
                color: chartColors.secondary,
              },
              { key: "s", label: "3rd", value: derived.record.shows, color: chartColors.tertiary },
              { key: "o", label: "4th+", value: derived.record.other, color: chartColors.slate },
            ]}
          />
        </div>
      </ChartCard>
    </div>
  );
}
