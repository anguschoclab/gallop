import { createFileRoute, Link } from "@tanstack/react-router";
import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import {
  AreaTrend,
  ChartCard,
  DeltaPill,
  MiniBar,
  Sparkline,
  StackedRatioBar,
  chartColors,
  formatCurrencyCompact,
  formatCurrencyFull,
} from "@/components/charts";

export const Route = createFileRoute("/analytics/")({
  component: AnalyticsOverview,
});

function AnalyticsOverview() {
  const d = useAnalyticsData();

  const cash90Delta =
    d.cashPoints.length > 1
      ? (d.cash - d.cashPoints[0].y) / Math.max(1, Math.abs(d.cashPoints[0].y))
      : 0;

  const winRate = d.wpsRatio.runs > 0 ? d.wpsRatio.wins / d.wpsRatio.runs : 0;
  const itmRate =
    d.wpsRatio.runs > 0
      ? (d.wpsRatio.wins + d.wpsRatio.places + d.wpsRatio.shows) / d.wpsRatio.runs
      : 0;

  const totalIncome30 = d.earningsVsSpend
    .slice(-4)
    .reduce((s, b) => s + b.income, 0);
  const totalSpend30 = d.earningsVsSpend
    .slice(-4)
    .reduce((s, b) => s + b.expense, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl text-cream">Analytics</h1>
          <p className="text-cream-muted mt-1 text-sm">
            Stable performance at a glance — drill into any tile for detail.
          </p>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-cream/40">
          Day {d.day}
        </div>
      </header>

      {/* Bento grid: 12-col, mixed-size tiles */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3 auto-rows-[160px]">
        {/* Cash tile - wide */}
        <ChartCard
          className="md:col-span-4 lg:col-span-5 row-span-2"
          title="Cash on hand"
          subtitle={formatCurrencyFull(d.cash)}
          trailing={<DeltaPill value={cash90Delta} asPercent />}
          footnote="Last 90 days"
          href="/analytics/finance"
        >
          <div className="h-full px-2">
            <AreaTrend
              data={d.cashPoints}
              height={180}
              yFormat={formatCurrencyCompact}
              xFormat={(x) => `D${x}`}
            />
          </div>
        </ChartCard>

        {/* Win rate tile */}
        <ChartCard
          className="md:col-span-2 lg:col-span-3"
          title="Win rate"
          subtitle={`${(winRate * 100).toFixed(1)}%`}
          footnote={`${d.wpsRatio.runs} runs`}
          href="/analytics/racing"
        >
          <div className="flex h-full items-end px-3 pb-3">
            <StackedRatioBar
              segments={[
                { key: "w", label: "W", value: d.wpsRatio.wins, color: chartColors.primary },
                { key: "p", label: "P", value: d.wpsRatio.places, color: chartColors.secondary },
                { key: "s", label: "S", value: d.wpsRatio.shows, color: chartColors.tertiary },
                {
                  key: "u",
                  label: "Unplaced",
                  value:
                    d.wpsRatio.runs -
                    d.wpsRatio.wins -
                    d.wpsRatio.places -
                    d.wpsRatio.shows,
                  color: chartColors.slate,
                },
              ]}
            />
          </div>
        </ChartCard>

        {/* In-the-money */}
        <ChartCard
          className="md:col-span-2 lg:col-span-2"
          title="ITM rate"
          subtitle={`${(itmRate * 100).toFixed(0)}%`}
          footnote="Top-3 finishes"
        >
          <div className="flex h-full items-center justify-center px-3">
            <Sparkline
              data={d.owned
                .flatMap((h) => h.raceHistory.slice(-10).map((r) => (r.position <= 3 ? 1 : 0)))
                .slice(-30)}
              height={60}
            />
          </div>
        </ChartCard>

        {/* Active horses */}
        <ChartCard
          className="md:col-span-2 lg:col-span-2"
          title="Active horses"
          subtitle={String(d.active.length)}
          footnote={`${d.owned.length} owned`}
          href="/analytics/stable"
        >
          <div className="h-full px-3 pb-3 flex items-end">
            <MiniBar
              rows={[
                { label: "80–100", value: d.energyBuckets[4], color: chartColors.primary },
                { label: "60–79", value: d.energyBuckets[3], color: chartColors.secondary },
                { label: "40–59", value: d.energyBuckets[2], color: chartColors.tertiary },
                { label: "0–39", value: d.energyBuckets[0] + d.energyBuckets[1], color: chartColors.negative },
              ]}
            />
          </div>
        </ChartCard>

        {/* Earnings vs spend - wide */}
        <ChartCard
          className="md:col-span-4 lg:col-span-7"
          title="Earnings vs spend"
          subtitle={`${formatCurrencyCompact(totalIncome30)} in · ${formatCurrencyCompact(totalSpend30)} out`}
          footnote="Last 12 weeks"
          href="/analytics/finance"
        >
          <div className="h-full px-2">
            <EarningsVsSpendChart data={d.earningsVsSpend} />
          </div>
        </ChartCard>

        {/* Top sire */}
        <ChartCard
          className="md:col-span-3 lg:col-span-3"
          title="Top sire"
          subtitle={d.topSire?.stallionName ?? "—"}
          footnote={d.topSire ? `AEI ${d.topSire.value.toFixed(2)}` : "No data yet"}
          href="/analytics/breeding"
        >
          <div className="h-full px-3 pb-3 flex items-end">
            {d.topSireTrend.length > 1 ? (
              <Sparkline data={d.topSireTrend} height={70} />
            ) : (
              <div className="text-[11px] text-cream/40 font-mono">Trend pending</div>
            )}
          </div>
        </ChartCard>

        {/* Expense breakdown */}
        <ChartCard
          className="md:col-span-3 lg:col-span-5"
          title="Top expenses · 30d"
          footnote="By subcategory"
          href="/analytics/finance"
        >
          <div className="h-full px-3 pb-3 overflow-y-auto">
            {d.expenseRows.length > 0 ? (
              <MiniBar rows={d.expenseRows} format={formatCurrencyCompact} />
            ) : (
              <div className="text-[11px] text-cream/40 font-mono">No expenses recorded</div>
            )}
          </div>
        </ChartCard>

        {/* ROI ranking */}
        <ChartCard
          className="md:col-span-3 lg:col-span-7"
          title="Horse ROI · top 5"
          footnote="Career earnings − tracked expenses"
          href="/analytics/stable"
        >
          <div className="h-full px-3 pb-3 overflow-y-auto">
            <MiniBar
              rows={d.rankedRoi.slice(0, 5).map((r) => ({
                label: r.name,
                value: r.net,
                color: r.net >= 0 ? chartColors.primary : chartColors.negative,
              }))}
              format={formatCurrencyCompact}
            />
          </div>
        </ChartCard>
      </div>

      <nav className="flex flex-wrap gap-2 pt-2">
        {[
          { to: "/analytics/stable", label: "Stable" },
          { to: "/analytics/racing", label: "Racing" },
          { to: "/analytics/finance", label: "Finance" },
          { to: "/analytics/breeding", label: "Breeding" },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-cream/70 hover:border-[var(--chart-1)] hover:text-cream transition-colors"
          >
            {l.label} →
          </Link>
        ))}
      </nav>
    </div>
  );
}

function EarningsVsSpendChart({
  data,
}: {
  data: { x: number; income: number; expense: number }[];
}) {
  // Inline dual-area chart, kept here to avoid yet another primitive file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } = require("recharts") as typeof import("recharts");
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="inc-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.5} />
            <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="exp-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.negative} stopOpacity={0.45} />
            <stop offset="100%" stopColor={chartColors.negative} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          tick={{ fill: chartColors.axis, fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `D${v}`}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: chartColors.axis, fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={formatCurrencyCompact}
        />
        <Tooltip
          contentStyle={{
            background: "var(--chart-tooltip-bg)",
            border: "1px solid color-mix(in oklab, var(--chart-1) 30%, transparent)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
          labelFormatter={(v) => `Day ${v}`}
          formatter={(value: number, name: string) => [formatCurrencyCompact(value), name]}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke={chartColors.primary}
          strokeWidth={1.75}
          fill="url(#inc-grad)"
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Spend"
          stroke={chartColors.negative}
          strokeWidth={1.75}
          fill="url(#exp-grad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
