import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useGame } from "@/platform/game/store";
import { Link } from "@tanstack/react-router";
import { Trophy, ChevronRight } from "lucide-react";
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_DESCRIPTIONS,
} from "@/domains/awards/application/awardsFacade";

export function LegacyAwardsWidget() {
  const awards = useGame((s) => s.awards);
  const playerAwards = awards.filter((a) => !a.stableId);
  const g1Wins = awards.filter((a) => a.isHistoric).length;
  const sortedPlayerAwards = [...playerAwards].sort((a, b) => b.year - a.year);
  const recentAward = sortedPlayerAwards[0];

  return (
    <Card className="lg:col-span-4 border-border bg-slate-900/40 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
        <Trophy className="h-32 w-32 rotate-12" />
      </div>
      <CardHeader className="py-3 border-b border-white/5 bg-black/20 relative z-10">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Legacy & Awards
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex-1 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center justify-around px-2">
            <div className="text-center space-y-1 group cursor-default">
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide opacity-60">
                G1 Victories
              </div>
              <div className="text-3xl font-bold text-fame font-mono leading-none tracking-tighter group-hover:scale-110 transition-transform">
                {g1Wins}
              </div>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="text-center space-y-1 group cursor-default">
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide opacity-60">
                Stable Awards
              </div>
              <div className="text-3xl font-bold text-primary font-mono leading-none tracking-tighter group-hover:scale-110 transition-transform">
                {playerAwards.length}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-5 bg-primary/5 border border-primary/10 rounded text-center space-y-3 group hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/20 group-hover:bg-primary/50 transition-colors" />
              <Trophy className="h-10 w-10 text-primary mx-auto drop-shadow-[0_0_12px_var(--border)] group-hover:rotate-6 transition-transform" />
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-primary pt-1">
                  Awards
                </div>
              </div>
              <Link
                to="/records"
                className="inline-flex items-center gap-1 text-[10px] text-foreground/40 group-hover:text-primary transition-colors font-bold uppercase tracking-tighter border-t border-white/5 pt-2 w-full justify-center"
              >
                View Records <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {recentAward && (
              <Link
                to="/awards/$category"
                params={{ category: recentAward.category }}
                className="block p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all"
              >
                <div className="text-[9px] text-primary/25 uppercase font-bold tracking-wide mb-1">
                  Most Recent Award · Y{recentAward.year}
                </div>
                <div className="text-sm font-bold text-primary mb-1">
                  {CATEGORY_DISPLAY_NAMES[recentAward.category]}
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-2">
                  {CATEGORY_DESCRIPTIONS[recentAward.category]}
                </div>
              </Link>
            )}

            <div className="text-center">
              <Link
                to="/awards"
                className="text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-wide transition-colors"
              >
                View Full Trophy Case
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
