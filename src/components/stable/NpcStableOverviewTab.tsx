import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Trophy } from "lucide-react";
import { TrophyCase } from "@/components/awards";
import { NumericValue } from "@/components/HorseBits";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { cn } from "@/lib/utils";
import { getRivalryStatusLabel, getRivalryBadgeColor } from "@/hooks/useNpcStableDetail";
import type { useNpcStableDetail } from "@/hooks/useNpcStableDetail";

interface NpcStableOverviewTabProps {
  stableId: string;
  pageData: ReturnType<typeof useNpcStableDetail>;
}

export function NpcStableOverviewTab({ stableId, pageData }: NpcStableOverviewTabProps) {
  const {
    stable,
    stableHorses,
    activeHorses,
    colts,
    fillies,
    friction,
    headToHead,
    grudgeMatches,
    awards,
  } = pageData;

  if (!stable) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
        <CardContent className="p-6 space-y-6">
          {stable.description && (
            <p className="text-sm text-cream/80 font-serif italic border-l-2 border-white/10 pl-4">
              {stable.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 px-3 py-1 border-white/10 text-cream/60 rounded-none font-mono text-[10px] uppercase"
            >
              <Brain className="w-3 h-3 text-blue-400" />
              {stable.personality.replace("-", " ")}
            </Badge>
            <span className="text-[10px] text-cream/40 font-mono uppercase tracking-tighter">
              {PERSONALITY_CONFIG[stable.personality]?.description}
            </span>
            {stable.preferredDistance && (
              <Badge className="text-[9px] bg-black/40 text-cream/60 border border-white/5 rounded-none px-2 font-black tracking-widest uppercase">
                SPEC: {stable.preferredDistance}m {stable.preferredSurface}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
            <div className="bg-black/20 p-3 border border-white/5 text-center">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                Total Horses
              </div>
              <div className="text-xl font-bold font-mono text-cream">{stableHorses.length}</div>
            </div>
            <div className="bg-black/20 p-3 border border-white/5 text-center">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                Active
              </div>
              <div className="text-xl font-bold font-mono text-success">{activeHorses.length}</div>
            </div>
            <div className="bg-black/20 p-3 border border-white/5 text-center">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                Colts/Horses
              </div>
              <div className="text-xl font-bold font-mono text-blue-400">{colts.length}</div>
            </div>
            <div className="bg-black/20 p-3 border border-white/5 text-center">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                Fillies/Mares
              </div>
              <div className="text-xl font-bold font-mono text-pink-400">{fillies.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {friction >= 40 && (
        <Card className="bg-slate-950/50 border border-white/5 rounded-none shadow-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-destructive">
                Rivalry Status
              </h3>
              <Badge className={getRivalryBadgeColor(friction)}>
                {getRivalryStatusLabel(friction)}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-cream/60">Friction Level</span>
                <span className="font-mono text-destructive">{friction}/100</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-destructive/60 transition-all"
                  style={{ width: `${(friction / 100) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs pt-2">
                <span className="text-cream/60">Head-to-Head Record</span>
                <span className="font-mono text-cream">
                  {headToHead.wins}-{headToHead.losses}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {grudgeMatches.length > 0 && (
        <Card className="bg-slate-900/40 border border-white/5 rounded-none shadow-xl">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-muted/60">
              Grudge Match History
            </h3>
            <div className="space-y-2">
              {grudgeMatches.map((match: any) => (
                <div
                  key={match.id}
                  className="bg-slate-950/30 border border-white/5 rounded p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-bold text-cream/80">{match.headline}</div>
                      <div className="text-[10px] text-cream/40">Day {match.day}</div>
                    </div>
                    <Badge className="bg-destructive text-slate-950">Grudge</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TrophyCase
        awards={awards?.filter((a: any) => a.stableId === stableId) ?? []}
        ownerName={stable.name}
        variant="compact"
      />
    </div>
  );
}
