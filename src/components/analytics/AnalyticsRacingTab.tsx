import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import { ChartCard, MiniBar, chartColors } from "@/components/charts";

export function AnalyticsRacingTab() {
  const d = useAnalyticsData();

  const buckets = [0, 0, 0, 0, 0, 0];
  d.owned.forEach((h) => {
    h.raceHistory.forEach((r) => {
      const b = (r as { beyer?: number }).beyer ?? 0;
      if (b <= 0) return;
      if (b < 60) buckets[0]++;
      else if (b < 70) buckets[1]++;
      else if (b < 80) buckets[2]++;
      else if (b < 90) buckets[3]++;
      else if (b < 100) buckets[4]++;
      else buckets[5]++;
    });
  });

  let turf = 0, dirt = 0, syn = 0;
  d.owned.forEach((h) => {
    h.raceHistory.forEach((r) => {
      const s = (r as { surface?: string }).surface;
      if (s === "turf") turf++;
      else if (s === "dirt") dirt++;
      else if (s === "synthetic") syn++;
    });
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-cream">Racing analytics</h2>
        <p className="text-cream-muted mt-1 text-sm">
          Beyer distribution, surface splits, and overall finishing pattern.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard
          title="Beyer distribution"
          subtitle={`${buckets.reduce((s, x) => s + x, 0)} starts with figures`}
          footnote="All owned horses, career"
        >
          <div className="px-3 py-2">
            <MiniBar
              rows={[
                { label: "<60", value: buckets[0], color: chartColors.slate },
                { label: "60–69", value: buckets[1], color: chartColors.tertiary },
                { label: "70–79", value: buckets[2], color: chartColors.secondary },
                { label: "80–89", value: buckets[3], color: chartColors.primary },
                { label: "90–99", value: buckets[4], color: chartColors.primary },
                { label: "100+", value: buckets[5], color: chartColors.primary },
              ]}
            />
          </div>
        </ChartCard>

        <ChartCard title="Surface splits" subtitle={`${turf + dirt + syn} starts`}>
          <div className="px-3 py-2">
            <MiniBar
              rows={[
                { label: "Turf", value: turf, color: chartColors.primary },
                { label: "Dirt", value: dirt, color: chartColors.secondary },
                { label: "Synthetic", value: syn, color: chartColors.tertiary },
              ]}
            />
          </div>
        </ChartCard>

        <ChartCard
          className="md:col-span-2"
          title="Finishing-position split"
          subtitle={`${d.wpsRatio.runs} runs`}
        >
          <div className="px-3 py-2">
            <MiniBar
              rows={[
                { label: "Wins", value: d.wpsRatio.wins, color: chartColors.primary },
                { label: "2nd (Place)", value: d.wpsRatio.places, color: chartColors.secondary },
                { label: "3rd (Show)", value: d.wpsRatio.shows, color: chartColors.tertiary },
                {
                  label: "Unplaced",
                  value: d.wpsRatio.runs - d.wpsRatio.wins - d.wpsRatio.places - d.wpsRatio.shows,
                  color: chartColors.slate,
                },
              ]}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
