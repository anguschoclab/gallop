import { useMemo } from "react";
import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import { ChartCard, MiniBar, Sparkline, chartColors } from "@/components/charts";
import {
  ANALYTICS_SIRE_TREND_DAYS,
  ANALYTICS_TOP_SIRES_DISPLAY,
  ANALYTICS_TOP_SIRE_TREND_DISPLAY,
} from "@/constants";

export function AnalyticsBreedingTab() {
  const d = useAnalyticsData();
  const overall = d.sireLeaderboards?.overall;
  const rankings = overall?.rankings ?? [];

  const sireTrendMap = useMemo(() => {
    const map = new Map<string, number[]>();
    const minDay = d.day - ANALYTICS_SIRE_TREND_DAYS;
    for (let i = 0; i < d.sireTrendHistory.length; i++) {
      const t = d.sireTrendHistory[i];
      if (t.day < minDay) continue;
      const arr = map.get(t.stallionId);
      if (arr) {
        arr.push(t.aei);
      } else {
        map.set(t.stallionId, [t.aei]);
      }
    }
    return map;
  }, [d.sireTrendHistory, d.day]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-cream">Breeding analytics</h2>
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
                rows={rankings.slice(0, ANALYTICS_TOP_SIRES_DISPLAY).map((r) => ({
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

        <ChartCard
          title={`Top ${ANALYTICS_TOP_SIRE_TREND_DISPLAY} · ${ANALYTICS_SIRE_TREND_DAYS}d AEI trend`}
          footnote="Each row independently scaled"
        >
          <div className="px-3 py-2 space-y-2">
            {rankings.slice(0, ANALYTICS_TOP_SIRE_TREND_DISPLAY).map((r) => {
              const series = sireTrendMap.get(r.stallionId) ?? [];
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
