import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { cn } from "@/lib/cn";
import { Building2, ChevronRight } from "lucide-react";
import { FACILITY_NAMES, type FacilityType } from "@/core/facilities";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NewsContent } from "@/components/narrative/NewsContent";

interface ReputationEvent {
  description: string;
  amount: number;
}

export function HQOpsWidget() {
  const facilities = useGame((s) => s.facilities);
  const reputation = useGame((s) => s.reputation);
  const recentReputationEvents = reputation?.events?.slice(-3).reverse() ?? [];

  return (
    <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-gold/10 flex items-center justify-center border border-gold/20 group-hover:bg-gold/20 transition-colors">
            <Building2 className="h-4 w-4 text-gold" />
          </div>
          <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
            H.Q. Ops
          </CardTitle>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/financial-report" aria-label="Go to H.Q. Ops financial report">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-cream-muted hover:text-gold group-hover:translate-x-0.5 transition-transform"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Go to H.Q. Ops financial report</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-muted/60 mb-2 px-1 flex justify-between">
            <span>Facility Health</span>
            <span>Rank</span>
          </div>
          <div className="space-y-2">
            {facilities &&
              Object.entries(facilities)
                .slice(0, 3)
                .map(([key, f]: [string, any]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs bg-black/20 p-2 border border-white/5 rounded hover:bg-black/40 transition-colors"
                  >
                    <span className="text-cream/80 font-medium">
                      {FACILITY_NAMES[key as FacilityType] ?? key}
                    </span>
                    <Badge className="bg-gold-subtle text-gold text-[10px] h-4 font-bold border border-gold/20">
                      LVL {f?.rank ?? 1}
                    </Badge>
                  </div>
                ))}
          </div>

          <div className="pt-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-muted/60 mb-2 px-1">
              Reputation Ledger
            </div>
            <div className="space-y-1.5">
              {recentReputationEvents.map((e, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-[11px] border-b border-white/5 pb-1.5 last:border-0"
                >
                  <span className="text-cream/60 truncate max-w-[140px] italic">
                    &ldquo;
                    <NewsContent text={e.description} />
                    &rdquo;
                  </span>
                  <span
                    className={cn(
                      "font-mono font-black",
                      e.amount > 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {e.amount > 0 ? "+" : ""}
                    {e.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-4 mt-auto border-t border-white/5">
          <Link to="/facilities" className="w-full">
            <Button
              variant="outline"
              className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-gold/20 hover:bg-gold/10 text-gold-muted"
            >
              Manage Horses
            </Button>
          </Link>
          <Link to="/settings" className="w-full">
            <Button
              variant="outline"
              className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-white/10 hover:bg-white/5 text-cream/40"
            >
              Configuration
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
