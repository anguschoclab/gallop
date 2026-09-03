import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/game/store";
import { Link } from "@tanstack/react-router";
import { Trophy, ChevronRight } from "lucide-react";
import { CATEGORY_DISPLAY_NAMES, CATEGORY_DESCRIPTIONS } from "@/core/awards/types";

export function LegacyAwardsWidget() {
  const awards = useGame((s) => s.awards);
  const playerAwards = awards.filter((a) => !a.stableId);
  const g1Wins = awards.filter((a) => a.isHistoric).length;
  const sortedPlayerAwards = [...playerAwards].sort((a, b) => b.year - a.year);
  const recentAward = sortedPlayerAwards[0];

  return (
    <Card className="lg:col-span-4 border-gold-muted bg-slate-900/40 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
        <Trophy className="h-32 w-32 rotate-12" />
      </div>
      <CardHeader className="py-3 border-b border-white/5 bg-black/20 relative z-10">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wide text-cream-muted">
          Legacy & Awards
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex-1 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center justify-around px-2">
            <div className="text-center space-y-1 group cursor-default">
              <div className="text-[9px] text-cream-muted uppercase font-bold tracking-wide opacity-60">
                G1 Victories
              </div>
              <div className="text-3xl font-bold text-fame font-mono leading-none tracking-tighter group-hover:scale-110 transition-transform">
                {g1Wins}
              </div>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="text-center space-y-1 group cursor-default">
              <div className="text-[9px] text-cream-muted uppercase font-bold tracking-wide opacity-60">
                Stable Awards
              </div>
              <div className="text-3xl font-bold text-gold font-mono leading-none tracking-tighter group-hover:scale-110 transition-transform">
                {playerAwards.length}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-5 bg-gold/5 border border-gold/10 rounded text-center space-y-3 group hover:bg-gold/10 hover:border-gold/30 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gold/20 group-hover:bg-gold/50 transition-colors" />
              <Trophy className="h-10 w-10 text-gold mx-auto drop-shadow-[0_0_12px_rgba(212,175,55,0.4)] group-hover:rotate-6 transition-transform" />
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-gold pt-1">
                  Awards
                </div>
              </div>
              <Link
                to="/records"
                className="inline-flex items-center gap-1 text-[10px] text-cream/40 group-hover:text-gold transition-colors font-bold uppercase tracking-tighter border-t border-white/5 pt-2 w-full justify-center"
              >
                View Records <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {recentAward && (
              <Link
                to="/awards/$category"
                params={{ category: recentAward.category }}
                className="block p-3 rounded-lg border border-gold/20 bg-gold/5 hover:bg-gold/10 hover:border-gold/40 transition-all"
              >
                <div className="text-[9px] text-gold-muted/80 uppercase font-bold tracking-wide mb-1">
                  Most Recent Award · Y{recentAward.year}
                </div>
                <div className="text-sm font-bold text-gold mb-1">
                  {CATEGORY_DISPLAY_NAMES[recentAward.category]}
                </div>
                <div className="text-[10px] text-cream-muted line-clamp-2">
                  {CATEGORY_DESCRIPTIONS[recentAward.category]}
                </div>
              </Link>
            )}

            <div className="text-center">
              <Link
                to="/awards"
                className="text-[10px] font-bold text-cream-muted hover:text-gold uppercase tracking-wide transition-colors"
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
