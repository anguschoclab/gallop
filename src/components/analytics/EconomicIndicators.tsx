import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useGame } from "@/game/store";
import { getEconomicSignal } from "@/core/ai/economyAI";
import { cn } from "@/lib/cn";

export function EconomicIndicators() {
  const economicState = useGame((s) => s.npcAIManager?.globalEconomicState);

  if (!economicState) {
    return null;
  }

  const signal = getEconomicSignal(economicState);
  const studFeePct = (economicState.studFeeTrend * 100).toFixed(1);
  const isStudUp = economicState.studFeeTrend > 0;
  const isStudDown = economicState.studFeeTrend < 0;

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
      </CardContent>
    </Card>
  );
}
