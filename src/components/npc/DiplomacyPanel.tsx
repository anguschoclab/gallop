import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGame } from "@/game/store";
import { cn } from "@/lib/cn";

interface DiplomacyPanelProps {
  stableId: string;
}

export function DiplomacyPanel({ stableId }: DiplomacyPanelProps) {
  const relationships = useGame((s) => s.npcAIManager?.stableStates?.[stableId]?.npcRelationships);
  const npcStables = useGame((s) => s.npcStables);

  if (!relationships || Object.keys(relationships).length === 0) {
    return null;
  }

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Diplomacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(relationships).map(([otherId, rel]) => {
          const otherStable = npcStables?.find((s) => s.id === otherId);
          const trustPct = (rel.trust * 100).toFixed(0);
          const isPositive = rel.trust > 0;

          return (
            <div key={otherId} className="bg-black/40 border border-white/5 p-3 space-y-2">
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
