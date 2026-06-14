import { createFileRoute } from "@tanstack/react-router";
import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import { ChartCard, MiniBar, Sparkline, chartColors } from "@/components/charts";
import { BackLink } from "@/components/charts/BackLink";

export const Route = createFileRoute("/analytics/breeding")({
  component: AnalyticsBreeding,
});

function AnalyticsBreeding() {
  const d = useAnalyticsData();
  const overall = d.sireLeaderboards?.overall;
  const rankings = overall?.rankings ?? [];

  return (
    <div className="space-y-6">
      <BackLink />
      <header>
        <h1 className="font-display text-3xl text-cream">Breeding analytics</h1>
        <p className="text-cream-muted mt-1 text-sm">
          Sire performance trends and leaderboard movement.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard
          title="Top sires by AEI"
          subtitle={overall?.title ?? "Overall"}
          footnote={`Updated D${overall?.lastUpdated ?? d.day}`}
        >
          <div className="px-3 py-2">
            {rankings.length > 0 ? (
              <MiniBar
                rows={rankings.slice(0, 8).map((r) => ({
                  label: `${r.rank}. ${r.stallionName}`,
                  value: r.value,
                  color: chartColors.primary,
                }))}
                format={(n) => n.toFixed(2)}
              />
            ) : (
              <div className="text-[11px] text-cream/40 font-mono">No leaderboard yet</div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Top 5 · 60d AEI trend" footnote="Each row independently scaled">
          <div className="px-3 py-2 space-y-2">
            {rankings.slice(0, 5).map((r) => {
              const series = d.sireTrendHistory
                .filter((t) => t.stallionId === r.stallionId && t.day >= d.day - 60)
                .map((t) => t.aei);
              return (
                <div key={r.stallionId} className="flex items-center gap-3">
                  <div className="w-32 text-[11px] truncate text-cream/80">{r.stallionName}</div>
                  <div className="flex-1">
                    {series.length > 1 ? (
                      <Sparkline data={series} height={28} variant="line" />
                    ) : (
                      <div className="text-[10px] text-cream/30 font-mono">no trend</div>
                    )}
                  </div>
                </div>
              );
            })}
            {rankings.length === 0 ? (
              <div className="text-[11px] text-cream/40 font-mono">No data</div>
            ) : null}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
