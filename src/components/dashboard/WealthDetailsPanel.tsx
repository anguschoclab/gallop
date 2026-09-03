import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SilkDot } from "@/components/SilkDot";
import { Link } from "@tanstack/react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/core/common/formatting";
import { horseMarketValue } from "@/core/horse/pricing";
import { isPlayerOwned, getStableId } from "@/core/horse/ownership";
import { WEALTH_DETAILS_TOP_HORSES_LIMIT } from "@/constants";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import type { WealthStandingEntry } from "@/core/standings/computeWealthStandings";
import type { Horse } from "@/game/types";

interface WealthDetailsPanelProps {
  stable: WealthStandingEntry | null;
  horses: Horse[];
}

export function WealthDetailsPanel({ stable, horses }: WealthDetailsPanelProps) {
  const [open, setOpen] = useState(true);

  const topHorses = useMemo(() => {
    if (!stable) return [];
    const stableHorses = horses.filter((h) =>
      stable.isPlayer ? isPlayerOwned(h) : getStableId(h) === stable.stableId,
    );
    return stableHorses
      .map((h) => ({ horse: h, value: horseMarketValue(h, horses) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, WEALTH_DETAILS_TOP_HORSES_LIMIT);
  }, [stable, horses]);

  if (!stable) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-gold/20 bg-slate-900/40">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stable.silkColor && <SilkDot color={stable.silkColor} size="sm" />}
                <CardTitle className="text-sm font-bold font-[family-name:var(--font-display)] text-cream">
                  {stable.isPlayer ? (
                    stable.name
                  ) : (
                    <Link to="/npc-stables/$stableId" params={{ stableId: stable.stableId }}>
                      {stable.name}
                    </Link>
                  )}
                </CardTitle>
                {stable.isPlayer && (
                  <Badge className="text-[8px] h-3.5 px-1 bg-gold/20 text-gold border-gold/30">
                    YOU
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn("h-4 w-4 text-cream/40 transition-transform", open && "rotate-180")}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-white/5 p-2">
                <div className="text-[9px] uppercase tracking-wide font-mono text-cream/40">
                  Cash
                </div>
                <div className="font-mono tabular-nums text-cream font-bold mt-0.5">
                  {formatCurrency(stable.cash)}
                </div>
              </div>
              <div className="rounded border border-white/5 p-2">
                <div className="text-[9px] uppercase tracking-wide font-mono text-cream/40">
                  Horse Assets
                </div>
                <div className="font-mono tabular-nums text-cream font-bold mt-0.5">
                  {formatCurrency(stable.horseAssets)}
                </div>
              </div>
              <div className="rounded border border-white/5 p-2">
                <div className="text-[9px] uppercase tracking-wide font-mono text-cream/40">
                  Horses
                </div>
                <div className="font-mono tabular-nums text-cream font-bold mt-0.5">
                  {stable.horseCount}
                </div>
              </div>
            </div>

            {topHorses.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-wide font-mono text-cream/40 mb-1">
                  Horse Breakdown
                </div>
                <div className="space-y-1">
                  {topHorses.map(({ horse, value }) => (
                    <div key={horse.id} className="flex items-center justify-between text-xs">
                      <span className="text-cream/70 truncate max-w-[140px]">{horse.name}</span>
                      <span className="font-mono tabular-nums text-cream/50">
                        {formatCurrency(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
