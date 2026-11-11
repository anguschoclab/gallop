import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import type { ExchangeTrade } from "@/domains/market/simulation/exchange";
import type { Stable } from "@/domains/stable/simulation/types";
import {
  computeMarketIndex,
  flowPressure,
  formatCurrency,
  marketIndexSeries,
  stableMoneyFlows,
} from "@/domains/market/application/exchangePanelService";
import { cn } from "@/shared/lib/cn";

/** Live Exchange market index plus where rival money is flowing. */
export function MarketIndexCard({
  trades,
  day,
  npcStables,
}: {
  trades: ExchangeTrade[];
  day: number;
  npcStables: Stable[];
}) {
  const index = useMemo(() => computeMarketIndex(trades, day), [trades, day]);
  const series = useMemo(() => marketIndexSeries(trades, day), [trades, day]);
  const flows = useMemo(() => {
    const map = stableMoneyFlows(trades, day);
    return npcStables
      .map((s) => ({ s, f: map.get(s.id), p: flowPressure(map.get(s.id), s.cash) }))
      .filter((x) => x.f && (x.f.inflow || x.f.outflow))
      .sort((a, b) => Math.abs(b.f!.net) - Math.abs(a.f!.net))
      .slice(0, 5);
  }, [trades, day, npcStables]);
  const change = index.value - index.previous;
  const lo = Math.min(...series.map((p) => p.value), 95);
  const hi = Math.max(...series.map((p) => p.value), 105);
  const pts = series
    .map((p, i) => `${(i / Math.max(1, series.length - 1)) * 100},${30 - ((p.value - lo) / (hi - lo)) * 30}`)
    .join(" ");
  const pct = Math.round((index.multiplier - 1) * 1000) / 10;

  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="p-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-xs text-muted-foreground">Market Index</span>
            <span className="text-2xl font-bold tabular-nums">{index.value.toFixed(1)}</span>
            <span
              className={cn(
                "text-xs inline-flex items-center gap-0.5 tabular-nums",
                change >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)} (7d)
            </span>
          </div>
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-10">
            <polyline points={pts} fill="none" className="stroke-primary" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="text-xs text-muted-foreground">
            100 = horses trading at their value. Based on {index.tradeCount} trades (
            {formatCurrency(index.volume)}) in 30 days. Rival quotes are{" "}
            {pct === 0 ? "at value" : `${pct > 0 ? "+" : ""}${pct}% vs value`}.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Rival money flow (30d)</div>
          {flows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rival trades yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {flows.map(({ s, f, p }) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  <span className="tabular-nums">
                    <span className={f!.net >= 0 ? "text-success" : "text-destructive"}>
                      {f!.net >= 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(f!.net))}
                    </span>
                    {p > 0 && <span className="text-muted-foreground"> · +{Math.round(p * 100)} pressure</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
