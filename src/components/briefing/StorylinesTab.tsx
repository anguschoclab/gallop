import { useGame } from "@/game/store";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NarrativeArc, StoryBeat } from "@/core/ai/npcCycleAI";
import type { Stable } from "@/game/types";
import { BookOpen, Sparkles, TrendingUp, CheckCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { NewsContent } from "@/components/narrative/NewsContent";
import { NarrativeArcCard } from "@/components/narrative/NarrativeArcCard";

export function StorylinesTab() {
  const npcAIManager = useGame((s) => s.npcAIManager);
  const npcStables = useGame((s) => s.npcStables);

  const stableMap = new Map<string, Stable>(npcStables.map((s) => [s.id, s]));

  const arcsByStable: Array<{
    stableId: string;
    stableName: string;
    arcs: NarrativeArc[];
    beats: StoryBeat[];
    dramaticPotential: number;
  }> = [];

  if (npcAIManager) {
    for (const [stableId, state] of Object.entries(npcAIManager.stableStates)) {
      const narrative = state.narrativeState;
      if (!narrative || (narrative.activeArcs.length === 0 && narrative.storyBeats.length === 0))
        continue;
      const stable = stableMap.get(stableId);
      arcsByStable.push({
        stableId,
        stableName: stable?.name ?? stableId,
        arcs: narrative.activeArcs,
        beats: narrative.storyBeats,
        dramaticPotential: narrative.dramaticPotential,
      });
    }
  }

  if (arcsByStable.length === 0) {
    return (
      <div className="p-20 text-center border-2 border-dashed border-white/5 bg-black/10">
        <BookOpen className="h-16 w-16 mx-auto mb-6 text-cream/5" />
        <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
          No Active Storylines
        </p>
        <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
          The racing world is quiet. Check back after a few race days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-gold/20 pb-4">
        <BookOpen className="h-4 w-4 text-gold-bright" />
        <h2 className="text-xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Active Storylines
        </h2>
        <Badge
          variant="outline"
          className="border-gold/30 text-gold-muted bg-gold/5 font-mono text-[10px] uppercase tracking-wide ml-auto"
        >
          {arcsByStable.length} Stables
        </Badge>
      </div>

      {arcsByStable.map(({ stableId, stableName, arcs, beats, dramaticPotential }) => (
        <Card
          key={stableId}
          className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-gold/40"
        >
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-cream font-[family-name:var(--font-display)]">
                <Link to="/npc-stables/$stableId" params={{ stableId }}>
                  {stableName}
                </Link>
              </h3>
              <div className="flex items-center gap-2">
                <Sparkles
                  className={cn(
                    "h-3.5 w-3.5",
                    dramaticPotential > 0.7 ? "text-gold-bright" : "text-cream/20",
                  )}
                />
                <span className="text-[10px] font-mono uppercase tracking-wide text-cream/40">
                  Drama: {Math.round(dramaticPotential * 100)}%
                </span>
              </div>
            </div>

            {arcs.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wide text-gold/40">
                  Active Arcs
                </div>
                {arcs.map((arc, i) => (
                  <div
                    key={`${arc.type}-${i}`}
                    className="flex items-start gap-3 p-3 bg-black/30 border border-white/5"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-gold/40 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[8px] h-3.5 px-1 font-black uppercase border-gold/20 text-gold-muted rounded-none tracking-wide"
                        >
                          {arc.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[9px] font-mono text-cream/20">
                          Day {arc.startDay}
                        </span>
                      </div>
                      <p className="text-xs text-cream/60 leading-relaxed">
                        <NewsContent
                          text={arc.beats[arc.beats.length - 1]?.body ?? "Story in progress..."}
                        />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {beats.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wide text-cream/30">
                  Recent Story Beats
                </div>
                <div className="divide-y divide-white/5">
                  {beats.slice(-5).map((beat, i) => (
                    <div key={`${beat.day}-${i}`} className="py-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-cream/20">Day {beat.day}</span>
                      </div>
                      <p className="text-xs font-bold text-cream/70 leading-tight">
                        <NewsContent text={beat.headline} />
                      </p>
                      <p className="text-[10px] text-cream/40 leading-relaxed italic">
                        <NewsContent text={beat.body} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Completed Arcs Archive */}
      {(() => {
        const completedArcs: Array<{
          arc: NarrativeArc;
          stableName: string;
          isRivalry: boolean;
        }> = [];

        for (const { stableId, stableName, arcs } of arcsByStable) {
          const stableAI = npcAIManager?.stableStates?.[stableId];
          const isRival = (stableAI?.friction ?? 0) > 60;
          for (const arc of arcs) {
            if (arc.status === "resolution" && arc.beats.length > 0) {
              completedArcs.push({ arc, stableName, isRivalry: isRival });
            }
          }
        }

        if (completedArcs.length === 0) return null;

        return (
          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-cream/60">
                Completed Arcs
              </h3>
              <Badge
                variant="outline"
                className="border-green-400/20 text-green-400/60 font-mono text-[9px] uppercase tracking-wide"
              >
                {completedArcs.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedArcs.map(({ arc, stableName, isRivalry }) => (
                <NarrativeArcCard
                  key={arc.id}
                  arc={arc}
                  stableName={stableName}
                  isRivalry={isRivalry}
                />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
