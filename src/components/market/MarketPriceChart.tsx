/**
 * MarketPriceChart.tsx - Live bloodstock price chart
 *
 * Plots the rolling average hammer price of completed trades with a volume
 * strip beneath it, so players can read the market before they buy or sell.
 */

import { useMemo } from "react";
import { AreaTrend, MiniBar, chartColors } from "@/components/charts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/common/formatting";
import { housePriceSeries } from "@/core/market/houseQuotes";
import type { ExchangeTrade } from "@/core/market/exchange";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";

interface MarketPriceChartProps {
  trades: ExchangeTrade[];
  day: number;
  windowDays?: number;
}

export function MarketPriceChart({ trades, day, windowDays = 30 }: MarketPriceChartProps) {
  const series = useMemo(() => housePriceSeries(trades, day, windowDays), [trades, day, windowDays]);

  const priced = series.filter((s) => s.avgPrice > 0);
  const first = priced[0]?.avgPrice ?? 0;
  const last = priced[priced.length - 1]?.avgPrice ?? 0;
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  const totalVolume = series.reduce((sum, s) => sum + s.volume, 0);
  const turnover = series.reduce((sum, s) => sum + s.turnover, 0);
  const up = changePct >= 0;

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cream/40">
              <Activity className="h-3 w-3 text-primary" />
              Bloodstock Price Index — last {windowDays} days
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-black font-mono tabular-nums text-cream tracking-tighter">
                {last > 0 ? formatCurrency(last) : "—"}
              </span>
              {priced.length > 1 ? (
                <Badge
                  variant="outline"
                  className={`gap-1 font-mono text-[10px] ${
                    up ? "text-success border-success/40" : "text-destructive border-destructive/40"
                  }`}
                >
                  {up ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {up ? "+" : ""}
                  {changePct.toFixed(1)}%
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cream/30">
                Trades
              </div>
              <div className="font-mono font-bold tabular-nums text-cream">{totalVolume}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cream/30">
                Turnover
              </div>
              <div className="font-mono font-bold tabular-nums text-cream">
                {formatCurrency(turnover)}
              </div>
            </div>
          </div>
        </div>

        {priced.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-[11px] font-mono uppercase tracking-widest text-cream/30">
            No trades settled yet — the index starts once horses change hands.
          </div>
        ) : (
          <>
            <AreaTrend
              data={series.map((s) => ({ x: s.day, y: s.avgPrice }))}
              color={up ? chartColors.primary : chartColors.negative}
              height={180}
              yFormat={(n) => formatCurrency(n)}
              xFormat={(x) => `D${x}`}
            />
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-cream/30">
                Daily volume
              </div>
              <MiniBar
                rows={series
                  .slice(-8)
                  .map((s) => ({ label: `Day ${s.day}`, value: s.volume }))}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
