import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { SilkDot } from "@/domains/shell/ui/SilkDot";
import { Link } from "@tanstack/react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { formatCurrency } from "@/shared/common/formatting";
import { cn } from "@/shared/lib/cn";
import { ChevronDown, Trophy } from "lucide-react";
import { useState } from "react";
import type { StandingEntry } from "@/domains/standings/application/standingsFacade";

export function StableDetailsPanel({ stable }: { stable: StandingEntry | null }) {
  const [open, setOpen] = useState(true);

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
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-white/5 p-2">
                <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40">
                  Range Earnings
                </div>
                <div className="font-mono tabular-nums text-foreground font-bold mt-0.5">
                  {formatCurrency(stable.rangePrizeMoney)}
                </div>
              </div>
              {!stable.isPlayer && (
                <>
                  <div className="rounded border border-white/5 p-2">
                    <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40">
                      Prestige
                    </div>
                    <div className="font-mono tabular-nums text-foreground font-bold mt-0.5">
                      {stable.prestige.toFixed(0)}
                    </div>
                  </div>
                  <div className="rounded border border-white/5 p-2">
                    <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40">
                      Wins vs You
                    </div>
                    <div className="font-mono tabular-nums text-destructive font-bold mt-0.5">
                      {stable.winsVsPlayer}
                    </div>
                  </div>
                </>
              )}
            </div>

            {stable.recentResults.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-wide font-mono text-foreground/40 mb-1">
                  Recent Results
                </div>
                <div className="space-y-1">
                  {stable.recentResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-foreground/70 truncate max-w-[140px]">
                        {r.raceId ? (
                          <Link to="/race/$raceId" params={{ raceId: r.raceId }}>
                            {r.raceName}
                          </Link>
                        ) : (
                          r.raceName
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {r.position === 1 && <Trophy className="h-3 w-3 text-primary" />}
                        <span
                          className={cn(
                            "font-mono tabular-nums",
                            r.position === 1 ? "text-primary font-bold" : "text-foreground/60",
                          )}
                        >
                          P{r.position}
                        </span>
                        {typeof r.gate === "number" && (
                          <span className="font-mono tabular-nums text-foreground/40">
                            G{r.gate}
                          </span>
                        )}
                        <span className="font-mono tabular-nums text-foreground/50">
                          {formatCurrency(r.purseEarned)}
                        </span>
                      </div>
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
