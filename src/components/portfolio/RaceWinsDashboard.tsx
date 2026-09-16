/**
 * RaceWinsDashboard.tsx - Charts of the player's racing earnings
 *
 * Visualises prize money won by racecourse, grade and distance, plus a
 * cumulative racing earnings curve.
 */

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import {
  AreaTrend,
  ChartCard,
  MiniBar,
  chartColors,
  formatCurrencyCompact,
  formatDay,
} from "@/components/charts";
import { StatCard } from "@/components/common/StatCard";
import { formatCurrency } from "@/lib/formatting";
import {
  cumulativeEarnings,
  playerRaceWinsSummary,
  winsByCourse,
  winsByDistance,
  winsByGrade,
  type PlayerRaceWinRecord,
  type WinGroup,
} from "@/services/stable/stableFacade";

const PALETTE = [
  chartColors.primary,
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function toRows(groups: WinGroup[], limit?: number) {
  return groups.slice(0, limit ?? groups.length).map((g, i) => ({
    label: g.label,
    value: g.earnings,
    hint: `${g.wins} ${g.wins === 1 ? "win" : "wins"} · avg ${formatCurrency(g.averagePayout)}`,
    color: PALETTE[i % PALETTE.length],
  }));
}

export function RaceWinsDashboard({ wins }: { wins: PlayerRaceWinRecord[] }) {
  const summary = useMemo(() => playerRaceWinsSummary(wins), [wins]);
  const courses = useMemo(() => winsByCourse(wins), [wins]);
  const grades = useMemo(() => winsByGrade(wins), [wins]);
  const distances = useMemo(() => winsByDistance(wins), [wins]);
  const curve = useMemo(() => cumulativeEarnings(wins), [wins]);

  if (wins.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-10 text-center">
        <Trophy className="mx-auto h-6 w-6 text-cream/30" />
        <p className="mt-3 text-sm text-cream/70">No wins yet.</p>
        <p className="mt-1 text-xs text-cream-muted">
          Win a race and your earnings by course, grade and distance appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Races Won"
          value={summary.totalWins.toLocaleString()}
          sub="Career victories"
          size="xl"
        />
        <StatCard
          label="Racing Earnings"
          value={formatCurrency(summary.totalEarnings)}
          sub={`${summary.gradedWins} graded wins`}
          size="xl"
        />
        <StatCard
          label="Best Payout"
          value={formatCurrency(summary.topPayout)}
          sub="Single race"
          size="xl"
        />
        <StatCard
          label="Average Payout"
          value={formatCurrency(summary.averagePayout)}
          sub="Per win"
          size="xl"
        />
      </div>

      <ChartCard
        title="Cumulative racing earnings"
        subtitle={formatCurrency(summary.totalEarnings)}
        info="Prize money banked from wins, accumulated over time."
        infoFormula="Running total of each winning payout, ordered by race day."
        footnote={curve.length === 1 ? "One winning day so far" : undefined}
      >
        <AreaTrend
          data={curve}
          height={220}
          yFormat={formatCurrencyCompact}
          xFormat={(x) => formatDay(Number(x))}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Earnings by course"
          subtitle={`${courses.length} ${courses.length === 1 ? "course" : "courses"}`}
          info="Prize money won at each racecourse."
          footnote={courses.length > 8 ? "Top 8 courses by earnings" : undefined}
        >
          <div className="px-2 py-1">
            <MiniBar rows={toRows(courses, 8)} format={formatCurrencyCompact} />
          </div>
        </ChartCard>

        <ChartCard
          title="Earnings by grade"
          subtitle={`${summary.gradedWins} graded`}
          info="Prize money won split by race grade or class."
        >
          <div className="px-2 py-1">
            <MiniBar rows={toRows(grades)} format={formatCurrencyCompact} />
          </div>
        </ChartCard>

        <ChartCard
          title="Earnings by distance"
          subtitle={`${distances.length} ${distances.length === 1 ? "band" : "bands"}`}
          info="Prize money won split by race trip."
          infoFormula="Sprint <1400m, Mile 1400-1700m, Middle 1700-2200m, Route 2200-2800m, Staying 2800m+."
        >
          <div className="px-2 py-1">
            <MiniBar rows={toRows(distances)} format={formatCurrencyCompact} />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
