import { createFileRoute } from "@tanstack/react-router";
import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import {
  AreaTrend,
  ChartCard,
  MiniBar,
  chartColors,
  formatCurrencyCompact,
  formatCurrencyFull,
} from "@/components/charts";
import { BackLink } from "@/components/charts/BackLink";

export const Route = createFileRoute("/analytics/finance")({
  component: AnalyticsFinance,
});

function AnalyticsFinance() {
  const d = useAnalyticsData();

  const totalIncome = d.earningsVsSpend.reduce((s, b) => s + b.income, 0);
  const totalSpend = d.earningsVsSpend.reduce((s, b) => s + b.expense, 0);
  const net = totalIncome - totalSpend;

  return (
    <div className="space-y-6">
      <BackLink />
      <header>
        <h1 className="font-display text-3xl text-cream">Finance analytics</h1>
        <p className="text-cream-muted mt-1 text-sm">
          Cash trajectory and where the money goes.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard
          className="md:col-span-2"
          title="Cash curve · 90d"
          subtitle={formatCurrencyFull(d.cash)}
          footnote="Balance after each ledger entry"
        >
          <div className="px-2 py-2">
            <AreaTrend
              data={d.cashPoints}
              height={240}
              yFormat={formatCurrencyCompact}
              xFormat={(x) => `D${x}`}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Income · 12w"
          subtitle={formatCurrencyFull(totalIncome)}
          footnote="Per-week totals"
        >
          <div className="px-2 py-2">
            <AreaTrend
              data={d.earningsVsSpend.map((b) => ({ x: b.x, y: b.income }))}
              color={chartColors.primary}
              height={180}
              yFormat={formatCurrencyCompact}
              xFormat={(x) => `D${x}`}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Spend · 12w"
          subtitle={formatCurrencyFull(totalSpend)}
          footnote={`Net ${formatCurrencyFull(net)}`}
        >
          <div className="px-2 py-2">
            <AreaTrend
              data={d.earningsVsSpend.map((b) => ({ x: b.x, y: b.expense }))}
              color={chartColors.negative}
              height={180}
              yFormat={formatCurrencyCompact}
              xFormat={(x) => `D${x}`}
            />
          </div>
        </ChartCard>

        <ChartCard
          className="md:col-span-2"
          title="Top expenses · 30d"
          footnote="By subcategory"
        >
          <div className="px-3 py-2">
            {d.expenseRows.length > 0 ? (
              <MiniBar rows={d.expenseRows} format={formatCurrencyCompact} />
            ) : (
              <div className="text-[11px] text-cream/40 font-mono">No expenses recorded</div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
