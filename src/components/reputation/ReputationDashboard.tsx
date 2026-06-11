import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Award, Star } from "lucide-react";
import { useGame } from "@/game/store";
import {
  getReputationTier,
  formatReputationTier,
  type ManagerReputation,
} from "@/core/reputation/reputationTypes";
import { reputationColor } from "@/lib/uiTokens";
import { cn } from "@/lib/utils";

export function ReputationDashboard() {
  const reputation = useGame((s) => s.reputation);
  const day = useGame((s) => s.day);

  if (!reputation) {
    return null;
  }

  const tier = getReputationTier(reputation.score);
  const recentEvents = reputation.events
    .filter((e) => day - e.day <= 30)
    .sort((a, b) => b.day - a.day)
    .slice(0, 10);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "race_win":
      case "graded_stakes_win":
        return <Trophy className="h-3 w-3" />;
      case "breeding_success":
      case "stallion_quality":
        return <Star className="h-3 w-3" />;
      case "rivalry_win":
        return <TrendingUp className="h-3 w-3" />;
      case "rivalry_loss":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Award className="h-3 w-3" />;
    }
  };

  const getSourceColor = (source: string) => {
    if (source.includes("win") || source === "breeding_success" || source === "stallion_quality") {
      return "text-green-400";
    }
    if (source.includes("loss")) {
      return "text-red-400";
    }
    return "text-cream/60";
  };

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-purple-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream flex items-center gap-2">
            <Trophy className="h-4 w-4 text-purple-400" /> Reputation
          </CardTitle>
          <Badge className={cn("border-white/10", reputationColor(tier))}>
            {formatReputationTier(tier)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Overview */}
        <div className="bg-black/40 border border-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cream/40 tracking-widest">
              Reputation Score
            </span>
            <span className="text-2xl font-mono font-black text-purple-400">
              {reputation.score}
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-300 h-2 rounded-full transition-all"
              style={{ width: `${(reputation.score / 1000) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] text-cream/40 uppercase tracking-widest font-black">
                Total Wins
              </div>
              <div className="text-sm font-mono font-black text-cream">
                {reputation.totalWins}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-cream/40 uppercase tracking-widest font-black">
                G1 Wins
              </div>
              <div className="text-sm font-mono font-black text-gold">
                {reputation.gradedWins.G1}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-cream/40 uppercase tracking-widest font-black">
                Years Active
              </div>
              <div className="text-sm font-mono font-black text-cream">
                {reputation.yearsActive}
              </div>
            </div>
          </div>
        </div>

        {/* Graded Wins Breakdown */}
        <div className="bg-black/40 border border-white/5 p-3 space-y-2">
          <div className="text-[9px] font-black uppercase text-cream/40 tracking-widest">
            Graded Stakes Wins
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[8px] text-cream/40 uppercase">G1</div>
              <div className="text-xs font-mono font-black text-yellow-400">
                {reputation.gradedWins.G1}
              </div>
            </div>
            <div>
              <div className="text-[8px] text-cream/40 uppercase">G2</div>
              <div className="text-xs font-mono font-black text-orange-400">
                {reputation.gradedWins.G2}
              </div>
            </div>
            <div>
              <div className="text-[8px] text-cream/40 uppercase">G3</div>
              <div className="text-xs font-mono font-black text-red-400">
                {reputation.gradedWins.G3}
              </div>
            </div>
            <div>
              <div className="text-[8px] text-cream/40 uppercase">Listed</div>
              <div className="text-xs font-mono font-black text-blue-400">
                {reputation.gradedWins.Listed}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <div className="space-y-2">
            <div className="text-[9px] font-black uppercase text-cream/40 tracking-widest">
              Recent Activity (30 Days)
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-black/20 border border-white/5 p-2 flex items-center gap-2"
                >
                  <div className={cn("text-cream/60", getSourceColor(event.source))}>
                    {getSourceIcon(event.source)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-cream/80 truncate">
                      {event.description}
                    </div>
                    <div className="text-[8px] text-cream/40 font-mono">
                      Day {event.day}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-mono font-black",
                      event.amount > 0 ? "text-green-400" : "text-red-400",
                    )}
                  >
                    {event.amount > 0 ? "+" : ""}
                    {event.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
