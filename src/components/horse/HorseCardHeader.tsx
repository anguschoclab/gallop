import { CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HorsePortraitBadge } from "@/components/horse/HorsePortrait";
import { SilkDot } from "@/components/SilkDot";
import { getCoatColor } from "@/core/horse/uiHelpers";
import { genderSymbol } from "@/core/horse/gender";
import { cn } from "@/lib/cn";
import type { Horse } from "@/game/types";
import { Trophy, Calendar } from "lucide-react";

interface HorseCardHeaderProps {
  horse: Horse;
  genderColor: string;
}

export function HorseCardHeader({ horse, genderColor }: HorseCardHeaderProps) {
  return (
    <CardHeader className="p-5 border-b border-white/5 bg-black/40">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <HorsePortraitBadge
            id={horse.id}
            coatColor={horse.coatColor}
            markings={horse.markings}
            gender={horse.gender}
            appearance={horse.appearance}
            size="md"
          />
          <SilkDot color={getCoatColor(horse.coatColor)} size="md" />
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(genderColor, "text-sm leading-none")}>
                {genderSymbol(horse.gender)}
              </span>
              <span className="font-bold text-xl text-cream font-[family-name:var(--font-display)] uppercase tracking-tight group-hover:text-gold transition-colors truncate">
                {horse.name}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-cream/40 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Age: {Math.floor(horse.age)}
              </span>
              {horse.hemisphere === "Southern" && (
                <>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-blue-400/60">SH</span>
                </>
              )}
              {horse.fame > 0 && (
                <>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-fame flex items-center gap-1">
                    <Trophy className="h-2.5 w-2.5" /> Fame {Math.round(horse.fame)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {horse.lifecycleStatus !== "active" && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-none text-[8px] font-black tracking-widest uppercase h-4 px-1",
                horse.lifecycleStatus === "retired"
                  ? "border-gold text-gold bg-gold/5"
                  : "border-destructive text-destructive bg-destructive/5",
              )}
            >
              {horse.lifecycleStatus}
            </Badge>
          )}
          {horse.healthStatus && horse.healthStatus !== "healthy" && (
            <Badge
              variant="destructive"
              className="rounded-none text-[8px] font-black tracking-widest uppercase h-4 px-1 animate-pulse"
            >
              {horse.healthStatus === "recovering" ? "Recovering" : "Unwell"}
            </Badge>
          )}
        </div>
      </div>
    </CardHeader>
  );
}
