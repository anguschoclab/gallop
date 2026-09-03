import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, BookOpen, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { NewsContent } from "@/components/narrative/NewsContent";
import type { NarrativeArc } from "@/core/ai/npcCycleAI";

interface NarrativeArcCardProps {
  arc: NarrativeArc;
  stableName: string;
  isRivalry?: boolean;
}

const STATUS_CONFIG: Record<
  NarrativeArc["status"],
  { icon: typeof Flame; color: string; progress: number }
> = {
  setup: { icon: BookOpen, color: "text-blue-400", progress: 25 },
  rising_action: { icon: Sparkles, color: "text-gold", progress: 50 },
  climax: { icon: Flame, color: "text-destructive", progress: 75 },
  resolution: { icon: CheckCircle, color: "text-green-400", progress: 100 },
};

export const NarrativeArcCard = memo(function NarrativeArcCard({
  arc,
  stableName,
  isRivalry,
}: NarrativeArcCardProps) {
  const config = STATUS_CONFIG[arc.status] ?? STATUS_CONFIG.setup;
  const StatusIcon = config.icon;
  const latestBeat = arc.beats[arc.beats.length - 1];

  return (
    <Card
      className={cn(
        "bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2",
        arc.status === "resolution" ? "border-l-green-400" : "border-l-gold/40",
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-3.5 w-3.5", config.color)} />
            <Badge
              variant="outline"
              className="text-[8px] h-3.5 px-1 font-black uppercase border-gold/20 text-gold-muted rounded-none tracking-wide"
            >
              {arc.type.replace(/_/g, " ")}
            </Badge>
            <span className="text-[9px] font-mono text-cream/20">Day {arc.startDay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isRivalry && (
              <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-[8px] uppercase tracking-wide">
                Rivalry Watch
              </Badge>
            )}
            <Badge
              className={cn(
                "text-[8px] uppercase tracking-wide border",
                arc.status === "climax"
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : arc.status === "resolution"
                    ? "bg-green-400/10 text-green-400 border-green-400/30"
                    : "bg-gold/10 text-gold border-gold/30",
              )}
            >
              {arc.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        <div className="text-xs font-bold text-cream/80">{stableName}</div>

        <div className="space-y-1" data-testid="arc-progress">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", config.color, "bg-current")}
              style={{ width: `${config.progress}%` }}
            />
          </div>
        </div>

        {latestBeat ? (
          <div className="space-y-1">
            <p className="text-xs font-bold text-cream/70 leading-tight">
              <NewsContent text={latestBeat.headline} />
            </p>
            <p className="text-[10px] text-cream/40 leading-relaxed italic">
              <NewsContent text={latestBeat.body} />
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-cream/30 italic">Story in progress...</p>
        )}
      </CardContent>
    </Card>
  );
});
