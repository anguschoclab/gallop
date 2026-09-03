import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import {
  ANALYTICS_ITM_SPARKLINE_RACES_PER_HORSE,
  ANALYTICS_ITM_SPARKLINE_MAX_POINTS,
  ANALYTICS_ROI_TOP_N,
  ANALYTICS_INCOME_SPEND_RECENT_WEEKS,
  ANALYTICS_CASH_LOOKBACK_DAYS,
  ANALYTICS_EARNINGS_WEEKS,
  ANALYTICS_EXPENSE_LOOKBACK_DAYS,
} from "@/constants";

export function AnalyticsOverviewTab() {
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
    .slice(-ANALYTICS_INCOME_SPEND_RECENT_WEEKS)
    .reduce((s, b) => s + b.income, 0);
  const totalSpend30 = d.earningsVsSpend
    .slice(-ANALYTICS_INCOME_SPEND_RECENT_WEEKS)
    .reduce((s, b) => s + b.expense, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-2xl text-cream">Overview</h2>
          <p className="text-cream-muted mt-1 text-sm">
            Stable performance at a glance — drill into any tile for detail.
          </p>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wide text-cream/40">
          Day {d.day}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3 auto-rows-[160px]">
        <CashChartCard cash={d.cash} cashPoints={d.cashPoints} cash90Delta={cash90Delta} />
        <WinRateCard winRate={winRate} wpsRatio={d.wpsRatio} />
        <ItmRateCard itmRate={itmRate} owned={d.owned} />
        <ActiveHorsesCard active={d.active} owned={d.owned} energyBuckets={d.energyBuckets} />
        <EarningsVsSpendCard
          totalIncome30={totalIncome30}
          totalSpend30={totalSpend30}
          data={d.earningsVsSpend}
        />
        <TopSireCard topSire={d.topSire} topSireTrend={d.topSireTrend} />
        <TopExpensesCard expenseRows={d.expenseRows} />
        <HorseRoiCard rankedRoi={d.rankedRoi} />
      </div>
    </div>
  );
}

function CashChartCard({
  cash,
  cashPoints,
  cash90Delta,
}: {
  cash: number;
  cashPoints: { x: number; y: number }[];
  cash90Delta: number;
}) {
  return (
    <ChartCard
      className="md:col-span-4 lg:col-span-5 row-span-2"
      title="Cash on hand"
      subtitle={formatCurrencyFull(cash)}
      trailing={<DeltaPill value={cash90Delta} asPercent />}
      footnote={`Last ${ANALYTICS_CASH_LOOKBACK_DAYS} days`}
    >
      <div className="h-full px-2">
        <AreaTrend
          data={cashPoints}
          height={180}
          yFormat={formatCurrencyCompact}
          xFormat={(x) => `D${x}`}
        />
      </div>
    </ChartCard>
  );
}

function WinRateCard({
  winRate,
  wpsRatio,
}: {
  winRate: number;
  wpsRatio: { wins: number; places: number; shows: number; runs: number };
}) {
  return (
    <ChartCard
      className="md:col-span-2 lg:col-span-3"
      title="Win rate"
      subtitle={`${(winRate * 100).toFixed(1)}%`}
      footnote={`${wpsRatio.runs} runs`}
    >
      <div className="flex h-full items-end px-3 pb-3">
        <StackedRatioBar
          segments={[
            { key: "w", label: "W", value: wpsRatio.wins, color: chartColors.primary },
            { key: "p", label: "P", value: wpsRatio.places, color: chartColors.secondary },
            { key: "s", label: "S", value: wpsRatio.shows, color: chartColors.tertiary },
            {
              key: "u",
              label: "Unplaced",
              value: wpsRatio.runs - wpsRatio.wins - wpsRatio.places - wpsRatio.shows,
              color: chartColors.slate,
            },
          ]}
        />
      </div>
    </ChartCard>
  );
}

function ItmRateCard({
  itmRate,
  owned,
}: {
  itmRate: number;
  owned: { raceHistory: { position: number }[] }[];
}) {
  return (
    <ChartCard
      className="md:col-span-2 lg:col-span-2"
      title="ITM rate"
      subtitle={`${(itmRate * 100).toFixed(0)}%`}
      footnote="Top-3 finishes"
    >
      <div className="flex h-full items-center justify-center px-3">
        <Sparkline
          data={owned
            .flatMap((h) =>
              h.raceHistory
                .slice(-ANALYTICS_ITM_SPARKLINE_RACES_PER_HORSE)
                .map((r) => (r.position <= 3 ? 1 : 0)),
            )
            .slice(-ANALYTICS_ITM_SPARKLINE_MAX_POINTS)}
          height={60}
        />
      </div>
    </ChartCard>
  );
}

function ActiveHorsesCard({
  active,
  owned,
  energyBuckets,
}: {
  active: unknown[];
  owned: unknown[];
  energyBuckets: number[];
}) {
  return (
    <ChartCard
      className="md:col-span-2 lg:col-span-2"
      title="Active horses"
      subtitle={String(active.length)}
      footnote={`${owned.length} owned`}
    >
      <div className="h-full px-3 pb-2 flex items-end">
        <MiniBar
          className="w-full"
          rows={[
            {
              label: "60+",
              value: energyBuckets[3] + energyBuckets[4],
              color: chartColors.primary,
            },
            { label: "40–59", value: energyBuckets[2], color: chartColors.tertiary },
            {
              label: "0–39",
              value: energyBuckets[0] + energyBuckets[1],
              color: chartColors.negative,
            },
          ]}
        />
      </div>
    </ChartCard>
  );
}

function EarningsVsSpendCard({
  totalIncome30,
  totalSpend30,
  data,
}: {
  totalIncome30: number;
  totalSpend30: number;
  data: { x: number; income: number; expense: number }[];
}) {
  return (
    <ChartCard
      className="md:col-span-4 lg:col-span-7"
      title="Earnings vs spend"
      subtitle={`${formatCurrencyCompact(totalIncome30)} in · ${formatCurrencyCompact(totalSpend30)} out`}
      footnote={`Last ${ANALYTICS_EARNINGS_WEEKS} weeks`}
    >
      <div className="h-full px-2">
        <EarningsVsSpendChart data={data} />
      </div>
    </ChartCard>
  );
}

function TopSireCard({
  topSire,
  topSireTrend,
}: {
  topSire: { stallionName: string; value: number } | null | undefined;
  topSireTrend: number[];
}) {
  return (
    <ChartCard
      className="md:col-span-3 lg:col-span-3"
      title="Top sire"
      subtitle={topSire?.stallionName ?? "—"}
      footnote={topSire ? `AEI ${topSire.value.toFixed(2)}` : "No data yet"}
    >
      <div className="h-full px-3 pb-3 flex items-end">
        {topSireTrend.length > 1 ? (
          <Sparkline data={topSireTrend} height={70} />
        ) : (
          <div className="text-[11px] text-cream/40 font-mono">Trend pending</div>
        )}
      </div>
    </ChartCard>
  );
}

function TopExpensesCard({ expenseRows }: { expenseRows: { label: string; value: number }[] }) {
  return (
    <ChartCard
      className="md:col-span-3 lg:col-span-5"
      title={`Top expenses · ${ANALYTICS_EXPENSE_LOOKBACK_DAYS}d`}
      footnote="By subcategory"
    >
      <div className="h-full px-3 pb-3 overflow-y-auto">
        {expenseRows.length > 0 ? (
          <MiniBar rows={expenseRows} format={formatCurrencyCompact} />
        ) : (
          <div className="text-[11px] text-cream/40 font-mono">No expenses recorded</div>
        )}
      </div>
    </ChartCard>
  );
}

function HorseRoiCard({ rankedRoi }: { rankedRoi: { name: string; net: number }[] }) {
  return (
    <ChartCard
      className="md:col-span-3 lg:col-span-7"
      title={`Horse ROI · top ${ANALYTICS_ROI_TOP_N}`}
      footnote="Career earnings − tracked expenses"
    >
      <div className="h-full px-3 pb-3 overflow-y-auto">
        <MiniBar
          rows={rankedRoi.slice(0, ANALYTICS_ROI_TOP_N).map((r) => ({
            label: r.name,
            value: r.net,
            color: r.net >= 0 ? chartColors.primary : chartColors.negative,
          }))}
          format={formatCurrencyCompact}
        />
      </div>
    </ChartCard>
  );
}

function EarningsVsSpendChart({
  data,
}: {
  data: { x: number; income: number; expense: number }[];
}) {
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
