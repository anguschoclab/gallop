import type { Horse } from "@/game/types";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Eye } from "lucide-react";
import { scoutGrade } from "@/core/horse/grading";
import { genderSymbol } from "@/core/horse/gender";
import { getCoatColor } from "@/core/horse/uiHelpers";
import { SilkDot } from "@/components/SilkDot";
import { HorsePortraitBadge } from "@/components/horse/HorsePortrait";
import { cn } from "@/lib/utils";
import type { useHorseCard } from "@/hooks/useHorseCard";

interface HorseCardScoutProps {
  horse: Horse;
  hookData: ReturnType<typeof useHorseCard>;
  className?: string;
}

export function HorseCardScout({ horse, hookData, className = "" }: HorseCardScoutProps) {
  const { ovr, genderColor, scoutStatus, displayStats, simpleHorseCards } = hookData;
  const [isAdvanced] = useState(!simpleHorseCards);
  const knownStats = displayStats?.stats || {};
  const hasAllStats = Object.keys(knownStats).length === 4;

  return (
    <Card
      className={cn(
        "bg-slate-900/60 border-white/5 rounded-none shadow-xl relative overflow-hidden group",
        className,
      )}
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <Eye className="h-32 w-32 -rotate-12" />
      </div>
      <CardHeader className="pb-3 border-b border-white/5 bg-black/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <HorsePortraitBadge
              id={horse.id}
              coatColor={horse.coatColor}
              markings={horse.markings}
              gender={horse.gender}
              appearance={horse.appearance}
              size="md"
            />
            <SilkDot color={getCoatColor(horse.coatColor)} size="md" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={cn(genderColor, "text-sm")}>{genderSymbol(horse.gender)}</span>
                <span className="font-bold text-lg text-cream font-[family-name:var(--font-display)] uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                  {horse.name}
                </span>
              </div>
              <div className="text-[9px] text-cream/40 font-mono uppercase tracking-widest flex items-center gap-2">
                <span>Age_{Math.floor(horse.age)}</span>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span className="text-fame flex items-center gap-1">
                  <Trophy className="h-2.5 w-2.5" /> {horse.fame}
                </span>
              </div>
            </div>
          </div>
          {scoutStatus && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-none text-[8px] font-black tracking-widest uppercase h-5",
                scoutStatus.color,
              )}
            >
              {scoutStatus.icon} {scoutStatus.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {["speed", "stamina", "acceleration", "consistency"].map((stat) => {
            const value = knownStats[stat as keyof typeof knownStats];
            const isUnknown = value === undefined;
            return (
              <div key={stat} className={isUnknown ? "opacity-30" : ""}>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-cream/40 mb-1">
                  <span>{stat.substring(0, 3)}</span>
                  <span className="font-mono text-cream/80">
                    {isUnknown ? "---" : isAdvanced ? Math.round(value) : scoutGrade(value)}
                  </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400/60"
                    style={{ width: isUnknown ? "0%" : `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t border-white/5 flex items-center justify-between bg-black/20 p-2 rounded">
          <div className="space-y-0.5">
            <div className="text-[8px] font-black uppercase tracking-widest text-cream/30">
              OVR Estimate
            </div>
            <div className="text-sm font-black font-mono text-cream">
              {hasAllStats
                ? isAdvanced
                  ? ovr
                  : scoutGrade(ovr)
                : displayStats?.overallEstimate
                  ? `~${displayStats.overallEstimate}`
                  : "LOCKED"}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-[8px] font-black uppercase tracking-widest text-cream/30">
              Form Trend
            </div>
            <div
              className={cn(
                "text-xs font-black font-mono",
                horse.form > 0
                  ? "text-success"
                  : horse.form < 0
                    ? "text-destructive"
                    : "text-cream/40",
              )}
            >
              {horse.form > 0 ? "+" : ""}
              {horse.form}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
