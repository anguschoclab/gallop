import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { useGame } from "@/game/store";
import { getEconomicSignal } from "@/core/ai/economyAIState";
import { cn } from "@/lib/cn";
import type { EconomicTrend } from "@/core/ai/strategicCoordinator";

function getSignalExplanation(signal: "bull" | "bear" | "stable"): string {
  switch (signal) {
    case "bull":
      return "Rising prices and increased breeding activity. Sellers' market.";
    case "bear":
      return "Falling prices and reduced demand. Buyers' market.";
    default:
      return "Stable market conditions with balanced supply and demand.";
  }
}

function getMarketPhase(trend: EconomicTrend): "expansion" | "contraction" | "stable" {
  const studUp = trend.studFeeTrend > 0.02;
  const studDown = trend.studFeeTrend < -0.02;
  const yearlingUp = trend.yearlingPriceIndex > 105;
  const yearlingDown = trend.yearlingPriceIndex < 95;
  if (studUp && yearlingUp) return "expansion";
  if (studDown && yearlingDown) return "contraction";
  return "stable";
}

export function EconomicIndicators() {
  const economicState = useGame((s) => s.npcAIManager?.globalEconomicState);
  const economicHistory = useGame((s) => s.npcAIManager?.economicHistory);

  if (!economicState) {
    return (
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream">
            Industry Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-cream/40 italic">
            Industry economic data will be available once NPC operations begin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const signal = getEconomicSignal(economicState);
  const studFeePct = (economicState.studFeeTrend * 100).toFixed(1);
  const isStudUp = economicState.studFeeTrend > 0;
  const isStudDown = economicState.studFeeTrend < 0;
  const phase = getMarketPhase(economicState);

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream">
            Economic Indicators
          </CardTitle>
          <Badge
            className={cn(
              "text-[9px] font-black uppercase tracking-wider border",
              signal === "bull"
                ? "bg-green-400/10 text-green-400 border-green-400/30"
                : signal === "bear"
                  ? "bg-red-400/10 text-red-400 border-red-400/30"
                  : "bg-gray-400/10 text-gray-400 border-gray-400/30",
            )}
          >
            {signal}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
            Stud Fee Trend
          </span>
          <span className="font-mono text-cream/80 text-[10px] flex items-center gap-1">
            {isStudUp ? (
              <TrendingUp className="h-3 w-3 text-green-400" />
            ) : isStudDown ? (
              <TrendingDown className="h-3 w-3 text-red-400" />
            ) : (
              <Minus className="h-3 w-3 text-cream-muted" />
            )}
            {studFeePct}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
            Yearling Price Index
          </span>
          <span className="font-mono text-cream/80 text-[10px]">
            {economicState.yearlingPriceIndex.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
            Claiming Market Activity
          </span>
          <span className="font-mono text-cream/80 text-[10px]">
            {economicState.claimingMarketActivity.toFixed(0)}
          </span>
        </div>

        <div className="pt-2 border-t border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-cream/40 uppercase tracking-widest text-[9px] font-black">
              Market Phase
            </span>
            <Badge
              className={cn(
                "text-[8px] font-black uppercase tracking-wider border",
                phase === "expansion"
                  ? "bg-green-400/10 text-green-400 border-green-400/30"
                  : phase === "contraction"
                    ? "bg-red-400/10 text-red-400 border-red-400/30"
                    : "bg-gray-400/10 text-gray-400 border-gray-400/30",
              )}
            >
              {phase}
            </Badge>
          </div>
        </div>

        <div className="text-[9px] text-cream/40 italic leading-relaxed pt-1">
          {getSignalExplanation(signal)}
        </div>

        {economicHistory && economicHistory.length > 1 && (
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-cream/30 mb-1">
              <Activity className="h-3 w-3" /> Yearling Index History
            </div>
            <div className="flex items-end gap-px h-8">
              {economicHistory.slice(-20).map((snap, idx) => {
                const height = Math.min(100, Math.max(5, (snap.yearlingPriceIndex - 80) * 2));
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex-1 min-w-[2px]",
                      snap.yearlingPriceIndex >= 100 ? "bg-green-400/40" : "bg-red-400/40",
                    )}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
