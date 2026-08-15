import { useGameWithShallow } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, Flame, Trophy, CheckCircle2 } from "lucide-react";
import type { CareerArcState } from "@/services/narrative/careerArcGenerator";

interface CareerArcPanelProps {
  horseId: string;
}

const STAGE_CONFIG: Record<
  CareerArcState["stage"],
  { label: string; icon: typeof Sparkles; color: string }
> = {
  none: { label: "None", icon: Sparkles, color: "text-cream/40" },
  rising_star: { label: "Rising Star", icon: TrendingUp, color: "text-gold-bright" },
  contender: { label: "Contender", icon: Flame, color: "text-gold" },
  champion_or_bust: { label: "Champion or Bust", icon: Trophy, color: "text-fame" },
  complete: { label: "Complete", icon: CheckCircle2, color: "text-emerald-400" },
};

export function CareerArcPanel({ horseId }: CareerArcPanelProps) {
  const arcState = useGameWithShallow((s) => s.narrativeArcs?.[horseId]);

  if (!arcState) return null;

  const config = STAGE_CONFIG[arcState.stage];
  const StageIcon = config.icon;

  return (
    <Card className="border-gold/30 bg-slate-900/40 overflow-hidden">
      <CardHeader className="bg-gold/5 border-b border-gold/10">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Sparkles size={16} />
          Career Arc
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center ${config.color}`}
          >
            <StageIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Current Stage
            </p>
            <p className={`text-lg font-black italic ${config.color}`}>{config.label}</p>
          </div>
        </div>

        <div className="h-px bg-gold/10" />

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Rising Star Day
            </p>
            <div className="text-xl font-black italic text-gold-bright tabular-nums">
              {arcState.stage1Day ?? "—"}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Contender Day
            </p>
            <div className="text-xl font-black italic text-gold tabular-nums">
              {arcState.stage2Day ?? "—"}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Champion Day
            </p>
            <div className="text-xl font-black italic text-fame tabular-nums">
              {arcState.stage3Day ?? "—"}
            </div>
          </div>
        </div>

        <div className="flex justify-between text-sm border-b border-gold/10 pb-2">
          <span className="text-gold/60 uppercase text-[10px] font-black tracking-widest">
            Consecutive Losses
          </span>
          <span className="font-bold tabular-nums text-cream">{arcState.consecutiveLosses}</span>
        </div>
      </CardContent>
    </Card>
  );
}
