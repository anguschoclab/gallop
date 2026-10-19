import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { SilkDot } from "@/domains/shell/ui/SilkDot";
import { Link } from "@tanstack/react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { formatCurrency } from "@/shared/common/formatting";
import { horseMarketValue } from "@/domains/horse/application/horseFacade";
import { isPlayerOwned, getStableId } from "@/domains/horse/application/horseFacade";
import { WEALTH_DETAILS_TOP_HORSES_LIMIT } from "@/shared/constants/dashboardConstants";
import { cn } from "@/shared/lib/cn";
import { ChevronDown } from "lucide-react";
import type { WealthStandingEntry } from "@/domains/standings/application/standingsFacade";
import type { Horse } from "@/platform/game/types";

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
      <Card className="border-primary/20 bg-slate-900/40">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stable.silkColor && <SilkDot color={stable.silkColor} size="sm" />}
                <CardTitle className="text-sm font-bold font-[family-name:var(--font-display)] text-foreground">
                  {stable.isPlayer ? (
                    stable.name
                  ) : (
                    <Link to="/npc-stables/$stableId" params={{ stableId: stable.stableId }}>
                      {stable.name}
                    </Link>
                  )}
                </CardTitle>
                {stable.isPlayer && (
                  <Badge className="text-[8px] h-3.5 px-1 bg-primary/20 text-primary border-primary/30">
                    YOU
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-foreground/40 transition-transform",
                  open && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-white/5 p-2">
                <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40">
                  Cash
                </div>
                <div className="font-mono tabular-nums text-foreground font-bold mt-0.5">
                  {formatCurrency(stable.cash)}
                </div>
              </div>
              <div className="rounded border border-white/5 p-2">
                <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40">
                  Horse Assets
                </div>
                <div className="font-mono tabular-nums text-foreground font-bold mt-0.5">
                  {formatCurrency(stable.horseAssets)}
                </div>
              </div>
              <div className="rounded border border-white/5 p-2">
                <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40">
                  Horses
                </div>
                <div className="font-mono tabular-nums text-foreground font-bold mt-0.5">
                  {stable.horseCount}
                </div>
              </div>
            </div>

            {topHorses.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40 mb-1">
                  Horse Breakdown
                </div>
                <div className="space-y-1">
                  {topHorses.map(({ horse, value }) => (
                    <div key={horse.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground/70 truncate max-w-[140px]">
                        {horse.name}
                      </span>
                      <span className="font-mono tabular-nums text-foreground/50">
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
