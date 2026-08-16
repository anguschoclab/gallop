import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import { cn } from "@/lib/cn";
import type { Cartel, DiplomaticEvent } from "@/core/ai/npcCycleAI";

interface DiplomacyPanelProps {
  stableId: string;
}

export function DiplomacyPanel({ stableId }: DiplomacyPanelProps) {
  const relationships = useGame((s) => s.npcAIManager?.stableStates?.[stableId]?.npcRelationships);
  const npcStables = useGame((s) => s.npcStables);
  const activeCartels = useGameWithShallow((s) => s.npcAIManager?.activeCartels);
  const npcStablesMap = React.useMemo(
    () => new Map(npcStables?.map((s) => [s.id, s]) || []),
    [npcStables],
  );

  if (!relationships || Object.keys(relationships).length === 0) {
    if (!activeCartels || activeCartels.length === 0) return null;
  }

  return (
    <div className="space-y-4">
      {relationships && Object.keys(relationships).length > 0 && (
        <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream">
              Diplomacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(relationships!).map(([otherId, rel]) => {
              const otherStable = npcStablesMap.get(otherId);
              const trustPct = (rel.trust * 100).toFixed(0);
              const isPositive = rel.trust > 0;

              return (
                <div key={otherId} className="bg-black/40 border border-white/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cream">
                      {otherStable?.name || otherId}
                    </span>
                    {rel.allianceType && (
                      <Badge
                        className={cn(
                          "text-[9px] font-black uppercase tracking-wider border",
                          rel.allianceType === "racing_coalition"
                            ? "bg-blue-400/10 text-blue-400 border-blue-400/30"
                            : rel.allianceType === "breeding_partnership"
                              ? "bg-purple-400/10 text-purple-400 border-purple-400/30"
                              : "bg-gray-400/10 text-gray-400 border-gray-400/30",
                        )}
                      >
                        {rel.allianceType.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                      Trust
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[10px]",
                        isPositive ? "text-green-400" : "text-red-400",
                      )}
                    >
                      {trustPct}%
                    </span>
                  </div>
                  {rel.history && rel.history.length > 0 && (
                    <DiplomacyTimeline events={rel.history.slice(-3)} />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {activeCartels && activeCartels.length > 0 && (
        <CartelSection
          activeCartels={activeCartels}
          stableId={stableId}
          npcStablesMap={npcStablesMap}
        />
      )}
    </div>
  );
}

function CartelSection({
  activeCartels,
  stableId,
  npcStablesMap,
}: {
  activeCartels: Cartel[];
  stableId: string;
  npcStablesMap: Map<string, { id: string; name: string }>;
}) {
  const relevantCartels = activeCartels.filter((c) => c.memberStableIds.includes(stableId));
  if (relevantCartels.length === 0) return null;

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-amber-400">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Active Cartels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {relevantCartels.map((cartel) => (
          <div key={cartel.id} className="bg-black/40 border border-white/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cream uppercase tracking-wider">
                {cartel.type} Cartel
              </span>
              <Badge className="text-[9px] font-black uppercase tracking-wider border bg-amber-400/10 text-amber-400 border-amber-400/30">
                {cartel.memberStableIds.length} Members
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {cartel.memberStableIds.map((id) => (
                <span
                  key={id}
                  className="text-[10px] text-cream/60 font-mono bg-white/5 px-2 py-0.5 rounded"
                >
                  {npcStablesMap.get(id)?.name || id}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const EVENT_COLORS: Record<DiplomaticEvent["type"], string> = {
  alliance_formed: "text-green-400",
  alliance_broken: "text-red-400",
  betrayal: "text-red-500",
  cooperation: "text-blue-400",
  competition: "text-orange-400",
};

function DiplomacyTimeline({ events }: { events: DiplomaticEvent[] }) {
  return (
    <div className="space-y-1 pt-1 border-t border-white/5">
      <div className="text-[8px] font-black uppercase tracking-widest text-cream/30">
        Recent Events
      </div>
      {events.map((event, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px]">
          <span className="font-mono text-cream/30 tabular-nums shrink-0">D{event.day}</span>
          <span
            className={cn("font-mono uppercase tracking-wider shrink-0", EVENT_COLORS[event.type])}
          >
            {event.type.replace(/_/g, " ")}
          </span>
          <span className="text-cream/40 truncate">{event.description}</span>
        </div>
      ))}
    </div>
  );
}
