import { useGameWithShallow } from "@/platform/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Activity, Users, TrendingUp } from "lucide-react";

export function NpcAIStatusPanel() {
  const difficultyModulator = useGameWithShallow((s) => s.npcAIManager?.difficultyModulator);
  const activeCartels = useGameWithShallow((s) => s.npcAIManager?.activeCartels);

  if (!difficultyModulator && (!activeCartels || activeCartels.length === 0)) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-slate-900/40">
      <CardHeader className="border-b border-primary/10">
        <CardTitle className="text-sm font-black uppercase tracking-[0.15em] flex items-center gap-2 text-primary">
          <Activity size={16} />
          NPC Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {difficultyModulator && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h4 className="text-xs font-black uppercase tracking-wide text-primary">
                Difficulty Modulator
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-foreground/40 uppercase text-[10px] font-black tracking-wide">
                  Player Win Rate
                </span>
                <p className="text-foreground font-mono">
                  {(difficultyModulator.playerWinRate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-foreground/40 uppercase text-[10px] font-black tracking-wide">
                  NPC Competence
                </span>
                <p className="text-foreground font-mono">
                  {(difficultyModulator.npcCompetenceMultiplier * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <span className="text-foreground/40 uppercase text-[10px] font-black tracking-wide">
                  Last Adjusted
                </span>
                <p className="text-foreground font-mono">
                  Day {difficultyModulator.lastAdjustmentDay}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeCartels && activeCartels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-primary" />
              <h4 className="text-xs font-black uppercase tracking-wide text-primary">
                Active Cartels ({activeCartels.length})
              </h4>
            </div>
            <div className="space-y-1">
              {activeCartels.map((cartel) => (
                <div
                  key={cartel.id}
                  className="flex justify-between text-xs border-b border-primary/5 pb-1"
                >
                  <span className="text-foreground/70 capitalize">{cartel.type} Cartel</span>
                  <span className="text-primary/60 font-mono">
                    {cartel.memberStableIds.length} members
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
