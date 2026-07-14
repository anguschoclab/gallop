import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { formatCurrency } from "@/core/common/formatting";
import type { Transaction } from "@/game/types";

interface FinancialChartProps {
  transactions: Transaction[];
  day: number;
  period: "week" | "month" | "year" | "allTime";
}

export function FinancialChart({ transactions, day, period }: FinancialChartProps) {
  const data = useMemo(() => {
    // Determine lookback period
    let daysToLookBack = 30;
    if (period === "week") daysToLookBack = 7;
    if (period === "year") daysToLookBack = 365;
    if (period === "allTime") daysToLookBack = day;

    const startDay = Math.max(1, day - daysToLookBack);

    // Group transactions by day
    const dayMap = new Map<number, { day: number; income: number; expenses: number }>();

    // Pre-fill all days in the range
    for (let d = startDay; d <= day; d++) {
      dayMap.set(d, { day: d, income: 0, expenses: 0 });
    }

    transactions.forEach((t) => {
      if (t.day >= startDay && t.day <= day) {
        const entry = dayMap.get(t.day)!;
        if (t.type === "income") entry.income += t.amount;
        else entry.expenses += t.amount;
      }
    });

    return Array.from(dayMap.values());
  }, [transactions, day, period]);

  if (data.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-muted/60">
          Fiscal Flow Analysis
        </div>
      </div>

      <div className="h-[300px] w-full bg-black/40 border border-white/5 p-4 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/40" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/40" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/40" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/40" />

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `D${v}`}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
            />
            <Tooltip
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 0,
                padding: "8px 12px",
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
              }}
              itemStyle={{
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: "bold",
                padding: "2px 0",
              }}
              labelStyle={{
                fontFamily: "monospace",
                fontSize: 9,
                color: "rgba(245,245,220,0.6)",
                textTransform: "uppercase",
                marginBottom: 6,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: 4,
              }}
              formatter={(v: number) => [formatCurrency(v), ""]}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={8}
              wrapperStyle={{
                fontSize: 9,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                paddingBottom: 20,
              }}
            />
            <Area
              type="stepAfter"
              dataKey="income"
              name="Revenue"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorIncome)"
              strokeWidth={2}
            />
            <Area
              type="stepAfter"
              dataKey="expenses"
              name="Outflow"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorExpenses)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
