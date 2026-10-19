import { useGameWithShallow } from "@/platform/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Trophy, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/shared/common/formatting";

interface FounderLegacyProps {
  horseId: string;
}

export function FounderLegacy({ horseId }: FounderLegacyProps) {
  const founder = useGameWithShallow((s) => s.founders?.[horseId]);

  if (!founder) return null;

  return (
    <Card className="border-primary bg-primary/5 overflow-hidden">
      <CardHeader className="bg-primary/10 border-b border-primary/20">
        <CardTitle className="text-sm font-black uppercase tracking-[0.15em] flex items-center gap-2 text-primary">
          <Trophy size={16} />
          Founder Legacy: {founder.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-wide">
              Influence Score
            </p>
            <div className="text-2xl font-black italic text-primary tabular-nums">
              {founder.influenceScore.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-wide">
              Descendants
            </p>
            <div className="text-2xl font-black italic text-primary tabular-nums">
              {founder.descendantCount}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-wide">
              Stakes Winners
            </p>
            <div className="text-2xl font-black italic text-primary tabular-nums text-primary">
              {founder.stakesWinners}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-wide">
              G1 Winners
            </p>
            <div className="text-2xl font-black italic text-primary tabular-nums text-fame">
              {founder.g1Winners}
            </div>
          </div>
        </div>

        <div className="h-px bg-primary/20" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h4 className="text-xs font-black uppercase tracking-wide text-primary">
                Dynastic Impact
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm border-b border-primary/10 pb-1">
                <span className="text-primary/60">Generation Depth</span>
                <span className="font-bold tabular-nums text-primary">
                  {founder.generationDepth} Generations
                </span>
              </div>
              <div className="flex justify-between text-sm border-b border-primary/10 pb-1">
                <span className="text-primary/60">Total Descendant Earnings</span>
                <span className="font-bold tabular-nums text-primary">
                  {formatCurrency(founder.totalEarnings)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-tight text-primary">
                Historical Founder Status
              </p>
              <p className="text-[10px] text-primary/70 italic leading-tight mt-1">
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
