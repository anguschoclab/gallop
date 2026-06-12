import { useGame, useGameWithShallow } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";

interface FounderLegacyProps {
  horseId: string;
}

export function FounderLegacy({ horseId }: FounderLegacyProps) {
  const founder = useGameWithShallow((s) => s.founders?.[horseId]);

  if (!founder) return null;

  return (
    <Card className="border-gold bg-gold/5 overflow-hidden">
      <CardHeader className="bg-gold/10 border-b border-gold/20">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Trophy size={16} />
          Founder Legacy: {founder.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Influence Score
            </p>
            <div className="text-2xl font-black italic text-gold tabular-nums">
              {founder.influenceScore.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Descendants
            </p>
            <div className="text-2xl font-black italic text-gold tabular-nums">
              {founder.descendantCount}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Stakes Winners
            </p>
            <div className="text-2xl font-black italic text-gold tabular-nums text-primary">
              {founder.stakesWinners}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              G1 Winners
            </p>
            <div className="text-2xl font-black italic text-gold tabular-nums text-fame">
              {founder.g1Winners}
            </div>
          </div>
        </div>

        <div className="h-px bg-gold/20" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-gold" />
              <h4 className="text-xs font-black uppercase tracking-widest text-gold">
                Dynastic Impact
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm border-b border-gold/10 pb-1">
                <span className="text-gold/60">Generation Depth</span>
                <span className="font-bold tabular-nums text-gold">
                  {founder.generationDepth} Generations
                </span>
              </div>
              <div className="flex justify-between text-sm border-b border-gold/10 pb-1">
                <span className="text-gold/60">Total Descendant Earnings</span>
                <span className="font-bold tabular-nums text-gold">
                  {formatCurrency(founder.totalEarnings)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gold/10 p-4 rounded-lg border border-gold/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-tight text-gold">
                Historical Founder Status
              </p>
              <p className="text-[10px] text-gold/70 italic leading-tight mt-1">
                This horse's influence has reached the permanent bloodline records. Their
                descendants have collectively defined the standard of excellence in the simulation.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
