import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import {
  ChartCard,
  MiniBar,
  Sparkline,
  chartColors,
  formatCurrencyCompact,
} from "@/components/charts";
import {
  ANALYTICS_ROI_RANKING_DISPLAY,
  ANALYTICS_FORM_CHART_DISPLAY,
  ANALYTICS_FORM_CHART_RECENT_RACES,
} from "@/constants";

export function AnalyticsStableTab() {
  const d = useAnalyticsData();

  const ageBuckets: Record<number, number> = {};
  d.owned.forEach((h) => {
    const age = h.age ?? 0;
    ageBuckets[age] = (ageBuckets[age] ?? 0) + 1;
  });
  const ageRows = Object.entries(ageBuckets)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([age, count]) => ({ label: `${age}yo`, value: count }));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-cream">Stable analytics</h2>
        <p className="text-cream-muted mt-1 text-sm">
          Fleet composition, energy, and per-horse return.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <ChartCard title="Age distribution" subtitle={`${d.owned.length} horses`}>
          <div className="px-3 py-2">
            {ageRows.length > 0 ? (
              <MiniBar rows={ageRows} />
            ) : (
              <div className="text-[11px] text-cream/40 font-mono">No horses</div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Energy distribution" subtitle={`${d.active.length} active`}>
          <div className="px-3 py-2">
            <MiniBar
              rows={[
                { label: "80–100 fresh", value: d.energyBuckets[4], color: chartColors.primary },
                { label: "60–79 fit", value: d.energyBuckets[3], color: chartColors.secondary },
                { label: "40–59 worn", value: d.energyBuckets[2], color: chartColors.tertiary },
                { label: "20–39 tired", value: d.energyBuckets[1], color: chartColors.slate },
                { label: "0–19 spent", value: d.energyBuckets[0], color: chartColors.negative },
              ]}
            />
          </div>
        </ChartCard>

        <ChartCard title="ROI ranked" subtitle={`${d.rankedRoi.length} horses`}>
          <div className="px-3 py-2 max-h-[260px] overflow-y-auto">
            <MiniBar
              rows={d.rankedRoi.slice(0, ANALYTICS_ROI_RANKING_DISPLAY).map((r) => ({
                label: r.name,
                value: r.net,
                hint: `Earned ${formatCurrencyCompact(r.earnings)} · spent ${formatCurrencyCompact(r.expense)}`,
                color: r.net >= 0 ? chartColors.primary : chartColors.negative,
              }))}
              format={formatCurrencyCompact}
            />
          </div>
        </ChartCard>

        <ChartCard
          className="md:col-span-2 lg:col-span-3"
          title={`Form pulse · last ${ANALYTICS_FORM_CHART_RECENT_RACES} starts per horse`}
          footnote="Each row: 1 = ITM (top-3), 0 = unplaced"
        >
          <div className="px-3 py-2 space-y-2 max-h-[320px] overflow-y-auto">
            {d.owned
              .filter((h) => h.raceHistory.length > 0)
              .slice(0, ANALYTICS_FORM_CHART_DISPLAY)
              .map((h) => {
                const series = h.raceHistory
                  .slice(-ANALYTICS_FORM_CHART_RECENT_RACES)
                  .map((r) => (r.position <= 3 ? 1 : 0));
                return (
                  <div key={h.id} className="flex items-center gap-3">
                    <div className="w-32 text-[11px] truncate text-cream/80">{h.name}</div>
                    <div className="flex-1">
                      <Sparkline data={series} height={28} variant="line" />
                    </div>
                  </div>
                );
              })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
