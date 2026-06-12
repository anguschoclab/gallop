import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, TrendingUp, Award, Clock } from "lucide-react";
import { useGame } from "@/game/store";
import {
  getClaimAllowance,
  getApprenticeStatus,
  formatApprenticeStatus,
  formatWeightAllowance,
  type ApprenticeStatus,
} from "@/core/apprentice/apprenticeTypes";
import { cn } from "@/lib/cn";

export function ApprenticeTracker() {
  const jockeys = useGame((s) => s.jockeys);
  const day = useGame((s) => s.day);

  // Filter for apprentices under contract with player
  const apprentices = jockeys?.filter(
    (j) => j.isApprentice && j.stableId === "player",
  ) || [];

  if (apprentices.length === 0) {
    return null;
  }

  const getStatusColor = (status: ApprenticeStatus) => {
    switch (status) {
      case "apprentice":
        return "text-blue-400";
      case "journeyman":
        return "text-green-400";
      case "senior":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusBadgeColor = (status: ApprenticeStatus) => {
    switch (status) {
      case "apprentice":
        return "bg-blue-400/10 text-blue-400 border-blue-400/30";
      case "journeyman":
        return "bg-green-400/10 text-green-400 border-green-400/30";
      case "senior":
        return "bg-purple-400/10 text-purple-400 border-purple-400/30";
      default:
        return "bg-gray-400/10 text-gray-400 border-gray-400/30";
    }
  };

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-400" /> Apprentice Tracker
          </CardTitle>
          <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/30">
            {apprentices.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {apprentices.map((apprentice) => {
          const status = getApprenticeStatus(apprentice.careerWins || 0);
          const allowance = getClaimAllowance(apprentice.careerWins || 0);
          const winsUntilGraduation = Math.max(0, 5 - (apprentice.careerWins || 0));
          const daysUntilContractEnd = apprentice.contractUntil
            ? apprentice.contractUntil - day
            : 0;

          return (
            <div
              key={apprentice.id}
              className="bg-black/40 border border-white/5 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-300 flex items-center justify-center text-xs font-black text-slate-950">
                    {apprentice.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-cream">{apprentice.name}</div>
                    <div className="text-[9px] text-cream/40 font-mono">
                      ID: {apprentice.id.slice(0, 8)}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-black uppercase tracking-wider border-white/10",
                    getStatusBadgeColor(status),
                  )}
                >
                  {formatApprenticeStatus(status)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                <div className="text-center">
                  <div className="text-[8px] text-cream/40 uppercase tracking-widest font-black">
                    Career Wins
                  </div>
                  <div className="text-sm font-mono font-black text-cream">
                    {apprentice.careerWins || 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] text-cream/40 uppercase tracking-widest font-black">
                    Allowance
                  </div>
                  <div className="text-sm font-mono font-black text-gold">
                    {formatWeightAllowance(allowance)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] text-cream/40 uppercase tracking-widest font-black">
                    Contract
                  </div>
                  <div className="text-sm font-mono font-black text-cream">
                    {daysUntilContractEnd}d
                  </div>
                </div>
              </div>

              {status === "apprentice" && winsUntilGraduation > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-cream/40 uppercase tracking-widest font-black flex items-center gap-1">
                      <TrendingUp className="h-2.5 w-2.5" /> Graduation
                    </span>
                    <span className="text-[10px] font-mono text-blue-400">
                      {winsUntilGraduation} wins
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-300 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${((apprentice.careerWins || 0) / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {status === "journeyman" && (
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-cream/40 uppercase tracking-widest font-black flex items-center gap-1">
                      <Award className="h-2.5 w-2.5" /> Senior Track
                    </span>
                    <span className="text-[10px] font-mono text-green-400">
                      {50 - (apprentice.careerWins || 0)} wins
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-300 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${((apprentice.careerWins || 0) / 50) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {daysUntilContractEnd <= 30 && daysUntilContractEnd > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1 text-[9px] text-orange-400">
                    <Clock className="h-2.5 w-2.5" />
                    <span className="font-black uppercase">
                      Contract expires in {daysUntilContractEnd} days
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
