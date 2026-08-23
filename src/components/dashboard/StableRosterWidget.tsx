import { TOOLTIP_DELAY_MS } from "@/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { overall, NumericValue, HorseBit } from "@/components/horse/HorseBits";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { isPlayerOwned } from "@/core/horse/ownership";
import { LayoutGrid, Users, Briefcase, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function StableRosterWidget() {
  const horses = useGame((s) => s.horses);
  const jockeys = useGame((s) => s.jockeys);
  const hiredStaff = useGame((s) => s.hiredStaff);

  const activeHorses = Object.values(horses)
    .filter((h) => isPlayerOwned(h) && h.lifecycleStatus === "active")
    .map(ensurePhenotypeResolved);
  const topHorses = activeHorses
    .slice()
    .sort((a, b) => overall(b) - overall(a))
    .slice(0, 3);

  return (
    <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300 shadow-xl">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-blue-400/10 flex items-center justify-center border border-blue-400/20 group-hover:bg-blue-400/20 transition-colors">
            <LayoutGrid className="h-4 w-4 text-blue-400" />
          </div>
          <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
            Stable & Roster
          </CardTitle>
        </div>
        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/stable" aria-label="Go to Stable & Roster">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-cream-muted hover:text-blue-400 group-hover:translate-x-0.5 transition-transform"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Go to Stable & Roster</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/60 mb-2 px-1 flex justify-between">
            <span>Top Stable Stars</span>
            <span>OVR</span>
          </div>
          <div className="space-y-2">
            {topHorses.map((h) => (
              <Link
                key={h.id}
                to="/stable/$horseId"
                params={{ horseId: h.id }}
                className="block group/item"
              >
                <div className="flex items-center justify-between p-2 rounded bg-white/[0.03] border border-white/5 hover:border-blue-400/30 hover:bg-blue-400/5 transition-all">
                  <HorseBit horse={h} />
                  <div className="flex items-center gap-3">
                    <NumericValue
                      value={overall(h)}
                      className="text-xs font-bold text-cream-muted group-hover/item:text-blue-400 transition-colors"
                    />
                    <Badge className="bg-black/40 text-cream text-[9px] h-4 px-1.5 font-mono border border-white/5">
                      E{Math.round(h.energy)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="pt-2 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/60 mb-1 px-1 flex justify-between items-center">
              <span>Personnel Brief</span>
              <Link to="/jockeys" className="text-[9px] hover:text-blue-400 underline">
                Roster
              </Link>
            </div>
            <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-blue-400/60" />
                <span className="text-cream/70 font-medium">Active Jockeys</span>
              </div>
              <span className="font-mono font-bold text-cream tabular-nums">
                {jockeys?.filter((j) => j.stableId === "player").length ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-3 w-3 text-blue-400/60" />
                <span className="text-cream/70 font-medium">Support Staff</span>
              </div>
              <span className="font-mono font-bold text-cream tabular-nums">
                {hiredStaff?.length ?? 0}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-4 mt-auto border-t border-white/5">
          <Link to="/horse-gallery" className="w-full">
            <Button
              variant="outline"
              className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-blue-400/20 hover:bg-blue-400/10 text-blue-400/70"
            >
              Horse Gallery
            </Button>
          </Link>
          <Link to="/breeding" className="w-full">
            <Button
              variant="outline"
              className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-pink-400/20 hover:bg-pink-400/10 text-pink-400/70"
            >
              Breeding Ops
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
