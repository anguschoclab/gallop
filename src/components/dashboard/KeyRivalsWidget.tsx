import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";
import { Zap } from "lucide-react";

interface Rival {
  stable: {
    id: string;
    name: string;
  };
  friction: number;
  diplomaticOrigin?: string;
  recentEncounters?: string[];
}

interface KeyRivalsWidgetProps {
  rivals: Rival[];
  calculateHeadToHead: (stableId: string) => { wins: number; losses: number };
}

function getRivalryStatusLabel(friction: number) {
  if (friction >= 80) return "Hostile";
  if (friction >= 60) return "Rival";
  if (friction >= 40) return "Competitive";
  return "Neutral";
}

function getRivalryBadgeColor(friction: number) {
  if (friction >= 80) return "bg-destructive text-slate-950";
  if (friction >= 60) return "bg-orange-500 text-slate-950";
  if (friction >= 40) return "bg-yellow-500 text-slate-950";
  return "bg-slate-700 text-cream";
}

export function KeyRivalsWidget({ rivals, calculateHeadToHead }: KeyRivalsWidgetProps) {
  return (
    <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-destructive/10 flex items-center justify-center border border-destructive/20 group-hover:bg-destructive/20 transition-colors">
            <Zap className="h-4 w-4 text-destructive" />
          </div>
          <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
            Key Rivals
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1">
        {rivals.length > 0 ? (
          <div className="space-y-3">
            {rivals.map((rival) => {
              const headToHead = calculateHeadToHead(rival.stable.id);
              return (
                <div key={rival.stable.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cream/80">
                      <Link to="/npc-stables/$stableId" params={{ stableId: rival.stable.id }}>
                        {rival.stable.name}
                      </Link>
                    </span>
                    <Badge className={getRivalryBadgeColor(rival.friction)}>
                      {getRivalryStatusLabel(rival.friction)}
                    </Badge>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive/60 transition-all"
                      style={{ width: `${(rival.friction / 100) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-cream/40">
                    <span>
                      Head-to-Head: {headToHead.wins}-{headToHead.losses}
                    </span>
                  </div>
                  {rival.diplomaticOrigin && (
                    <div className="text-[9px] text-cream/30 italic font-mono">
                      Origin: {rival.diplomaticOrigin}
                    </div>
                  )}
                  {rival.recentEncounters && rival.recentEncounters.length > 0 && (
                    <div className="space-y-0.5 pt-1 border-t border-white/5">
                      <div className="text-[8px] font-black uppercase tracking-wide text-cream/20">
                        Recent
                      </div>
                      {rival.recentEncounters.slice(-2).map((enc, idx) => (
                        <div key={idx} className="text-[9px] text-cream/40">
                          {enc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-cream/30 italic">
            No bitter rivals yet — keep winning.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
