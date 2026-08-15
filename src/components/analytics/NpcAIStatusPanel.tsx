import { useGameWithShallow } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, TrendingUp } from "lucide-react";

export function NpcAIStatusPanel() {
  const difficultyModulator = useGameWithShallow((s) => s.npcAIManager?.difficultyModulator);
  const activeCartels = useGameWithShallow((s) => s.npcAIManager?.activeCartels);

  if (!difficultyModulator && (!activeCartels || activeCartels.length === 0)) {
    return null;
  }

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Activity size={16} />
          NPC AI Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {difficultyModulator && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-gold" />
              <h4 className="text-xs font-black uppercase tracking-widest text-gold">
                Difficulty Modulator
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
                  Player Win Rate
                </span>
                <p className="text-cream font-mono">
                  {(difficultyModulator.playerWinRate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
                  NPC Competence
                </span>
                <p className="text-cream font-mono">
                  {(difficultyModulator.npcCompetenceMultiplier * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
                  Last Adjusted
                </span>
                <p className="text-cream font-mono">Day {difficultyModulator.lastAdjustmentDay}</p>
              </div>
            </div>
          </div>
        )}

        {activeCartels && activeCartels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gold" />
              <h4 className="text-xs font-black uppercase tracking-widest text-gold">
                Active Cartels ({activeCartels.length})
              </h4>
            </div>
            <div className="space-y-1">
              {activeCartels.map((cartel) => (
                <div
                  key={cartel.id}
                  className="flex justify-between text-xs border-b border-gold/5 pb-1"
                >
                  <span className="text-cream/70 capitalize">{cartel.type} Cartel</span>
                  <span className="text-gold/60 font-mono">
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
