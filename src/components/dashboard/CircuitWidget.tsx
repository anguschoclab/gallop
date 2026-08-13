import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { NumericValue } from "@/components/horse/HorseBits";
import { formatCurrency } from "@/core/common/formatting";
import { Globe, ChevronRight, Store, Gavel } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function CircuitWidget() {
  const day = useGame((s) => s.day);
  const races = useGame((s) => s.races);
  const auctions = useGame((s) => s.auctions);

  const upcoming = Object.values(races)
    .filter((r) => !r.resolved && !r.cancelled && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 3);

  const activeAuctions = auctions?.filter((a) => !a.resolved) ?? [];

  return (
    <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-success/10 flex items-center justify-center border border-success/20 group-hover:bg-success/20 transition-colors">
            <Globe className="h-4 w-4 text-success" />
          </div>
          <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
            The Circuit
          </CardTitle>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/races"
                search={{
                  grade: "all",
                  country: "all",
                  surface: "all",
                  track: "all",
                  owned: "all",
                  q: "",
                }}
                aria-label="Go to The Circuit races"
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-cream-muted hover:text-success group-hover:translate-x-0.5 transition-transform"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Go to The Circuit races</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60 mb-2 px-1 flex justify-between">
            <span>Upcoming Races</span>
            <span>D / P</span>
          </div>
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 rounded bg-black/20 border border-white/5 hover:bg-black/40 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[11px] font-bold text-cream truncate">
                    <Link to="/race/$raceId" params={{ raceId: r.id }}>
                      {r.name}
                    </Link>
                  </div>
                  <div className="text-[9px] text-cream-muted uppercase font-mono tracking-tighter opacity-60">
                    {r.distance}m · {r.raceClass}
                  </div>
                </div>
                {r.entries.some((e: { owned: boolean }) => e.owned) ? (
                  <Badge className="bg-success text-slate-950 text-[8px] h-4 font-black px-1 border-none shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                    ENTERED
                  </Badge>
                ) : (
                  <div className="text-right">
                    <div className="text-[10px] font-mono font-bold text-cream">D{r.day}</div>
                    <NumericValue
                      value={formatCurrency(r.purse)}
                      className="text-[9px] font-bold text-success/70"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60 mb-1 px-1 flex justify-between items-center">
              <span>Global Markets</span>
              <Link to="/stallions" className="text-[9px] hover:text-success underline">
                Sire Watch
              </Link>
            </div>
            <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
              <div className="flex items-center gap-2">
                <Store className="h-3 w-3 text-success/60" />
                <span className="text-cream/70 font-medium">Daily Market</span>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] h-4 border-success/20 text-success uppercase font-bold tracking-widest"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
              <div className="flex items-center gap-2">
                <Gavel className="h-3 w-3 text-success/60" />
                <span className="text-cream/70 font-medium">Public Auctions</span>
              </div>
              <span className="font-mono font-bold text-cream tabular-nums">
                {activeAuctions.length}{" "}
                <span className="text-[9px] text-cream/40 font-normal uppercase ml-1">Open</span>
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-4 mt-auto border-t border-white/5">
          <Link to="/market" className="w-full">
            <Button
              variant="outline"
              className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-success/20 hover:bg-success/10 text-success/70"
            >
              Claiming Market
            </Button>
          </Link>
          <Link to="/auction" className="w-full">
            <Button
              variant="outline"
              className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-white/10 hover:bg-white/5 text-cream/40"
            >
              Auction Block
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
