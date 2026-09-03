import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Handshake, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NpcRelationship, Cartel } from "@/core/ai/npcCycleAI";
import type { Stable } from "@/game/types";

interface RelationshipGraphProps {
  stableId: string;
  relationships: Record<string, NpcRelationship>;
  stables: Stable[];
  cartels?: Cartel[];
}

export const RelationshipGraph = memo(function RelationshipGraph({
  stableId,
  relationships,
  stables,
  cartels,
}: RelationshipGraphProps) {
  const stablesMap = new Map(stables.map((s) => [s.id, s]));
  const entries = Object.entries(relationships);

  if (entries.length === 0) {
    return (
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
        <CardHeader className="bg-black/20 border-b border-white/5">
          <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40 flex items-center gap-2">
            <Network className="h-3 w-3 text-blue-400" /> Relationship Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-[10px] font-mono text-cream/20 uppercase tracking-wide italic">
          No diplomatic relationships established yet.
        </CardContent>
      </Card>
    );
  }

  const stableCartels = cartels?.filter((c) => c.memberStableIds.includes(stableId)) ?? [];

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-indigo-400">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40 flex items-center gap-2">
          <Network className="h-3 w-3 text-indigo-400" /> Relationship Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {entries.map(([otherId, rel]) => {
          const otherStable = stablesMap.get(otherId);
          const isPositive = rel.trust > 0;
          const trustPct = Math.round(rel.trust);

          return (
            <div
              key={otherId}
              className="bg-black/40 border border-white/5 p-3 space-y-2"
              data-testid="relationship-row"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cream">{otherStable?.name || otherId}</span>
                {rel.allianceType && (
                  <Badge
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider border",
                      rel.allianceType === "racing_coalition"
                        ? "bg-blue-400/10 text-blue-400 border-blue-400/30"
                        : rel.allianceType === "breeding_partnership"
                          ? "bg-purple-400/10 text-purple-400 border-purple-400/30"
                          : rel.allianceType === "economic_cartel"
                            ? "bg-gold/10 text-gold border-gold/30"
                            : "bg-gray-400/10 text-gray-400 border-gray-400/30",
                    )}
                  >
                    {rel.allianceType.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-cream/40 uppercase tracking-wide text-[10px] font-black">
                  Trust
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    isPositive ? "text-green-400" : "text-red-400",
                  )}
                >
                  {trustPct > 0 ? "+" : ""}
                  {trustPct}
                </span>
              </div>

              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    isPositive ? "bg-green-400/60" : "bg-red-400/60",
                  )}
                  style={{ width: `${Math.abs(rel.trust)}%` }}
                />
              </div>

              {rel.history.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-white/5">
                  <div className="text-[9px] font-black uppercase tracking-wide text-cream/30">
                    Diplomatic Timeline
                  </div>
                  {rel.history.slice(-3).map((event, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[10px] text-cream/50">
                      {event.type === "betrayal" ? (
                        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <Handshake className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                      )}
                      <span>
                        <span className="font-mono text-cream/30">Day {event.day}</span>{" "}
                        {event.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {stableCartels.length > 0 && (
          <div className="pt-2 border-t border-white/5 space-y-1">
            <div className="text-[9px] font-black uppercase tracking-wide text-cream/30">
              Cartel Membership
            </div>
            {stableCartels.map((cartel) => (
              <div key={cartel.id} className="flex items-center gap-2 text-[10px] text-cream/50">
                <Badge className="bg-gold/10 text-gold border border-gold/30 text-[8px] uppercase tracking-wide">
                  {cartel.type} cartel
                </Badge>
                <span className="font-mono">{cartel.memberStableIds.length} members</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
