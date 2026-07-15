import type { Horse } from "@/game/types";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { scoutGrade } from "@/core/horse/grading";
import { genderSymbol } from "@/core/horse/gender";
import { getCoatColor } from "@/core/horse/uiHelpers";
import { SilkDot } from "@/components/SilkDot";
import { HorsePortraitBadge } from "@/components/horse/HorsePortrait";
import { cn } from "@/lib/cn";
import type { useHorseCard } from "@/hooks/horse/useHorseCard";

interface HorseCardCompactProps {
  horse: Horse;
  hookData: ReturnType<typeof useHorseCard>;
  onClick?: () => void;
  className?: string;
}

export function HorseCardCompact({
  horse,
  hookData,
  onClick,
  className = "",
}: HorseCardCompactProps) {
  const { ovr, genderColor, scoutStatus, simpleHorseCards } = hookData;
  const [isAdvanced] = useState(!simpleHorseCards);

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "bg-slate-900/40 border-white/5 rounded-none hover:border-gold/40 transition-all duration-300 relative overflow-hidden group shadow-xl",
        onClick &&
          "cursor-pointer focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
        className,
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gold/10 group-hover:bg-gold transition-colors z-10" />
      <CardContent className="p-3 pl-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <HorsePortraitBadge
            id={horse.id}
            coatColor={horse.coatColor}
            markings={horse.markings}
            gender={horse.gender}
            appearance={horse.appearance}
            size="sm"
          />
          <SilkDot color={getCoatColor(horse.coatColor)} size="sm" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-tight text-cream group-hover:text-gold transition-colors truncate",
                )}
              >
                {horse.name}
              </span>
              {horse.activeInjury && (
                <AlertCircle className="h-3 w-3 text-destructive animate-pulse shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-cream/40">
              <span className={genderColor}>{genderSymbol(horse.gender)}</span>
              <span>Age: {Math.floor(horse.age)}</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span>OVR: {isAdvanced ? ovr : scoutGrade(ovr)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <BookmarkButton
            type="horse"
            id={horse.id}
            label={horse.name}
            subtitle={`Age ${Math.floor(horse.age)} · ${horse.gender}`}
          />
          <Badge
            className={cn(
              "text-[9px] font-mono h-4 rounded-none px-1 border border-white/5",
              horse.energy > 50 ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
            )}
          >
            E:{Math.round(horse.energy)}%
          </Badge>
          {scoutStatus && (
            <Badge
              variant="outline"
              className={cn("text-[8px] h-3.5 px-1 rounded-none", scoutStatus.color)}
            >
              {scoutStatus.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
