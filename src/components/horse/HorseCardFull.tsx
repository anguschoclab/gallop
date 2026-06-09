import type { Horse } from "@/game/types";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HorseCardHeader } from "./HorseCardHeader";
import { HorseStatsPanel } from "./HorseStatsPanel";
import { HorseMetaPanel } from "./HorseMetaPanel";
import { HorseActionFooter } from "./HorseActionFooter";
import { getInjuryColor, getInjuryLabel } from "@/core/horse/uiHelpers";
import { cn } from "@/lib/utils";
import type { useHorseCard } from "@/hooks/useHorseCard";
import { Ruler, Weight, HeartPulse } from "lucide-react";

interface HorseCardFullProps {
  horse: Horse;
  hookData: ReturnType<typeof useHorseCard>;
  onClick?: () => void;
  className?: string;
}

export function HorseCardFull({ horse, hookData, onClick, className = "" }: HorseCardFullProps) {
  const { ovr, genderColor, gradeColor, sparklineData, simpleHorseCards } = hookData;
  const [isAdvanced, setIsAdvanced] = useState(!simpleHorseCards);

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
        "bg-slate-900/60 border-white/5 rounded-none shadow-2xl relative overflow-hidden group flex flex-col h-full",
        onClick &&
          "cursor-pointer hover:border-gold/40 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
        className,
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gold/20 group-hover:bg-gold transition-colors z-10" />

      <HorseCardHeader horse={horse} genderColor={genderColor} />

      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Biometrics Strip */}
        <div className="flex items-center justify-between px-5 py-2 bg-white/[0.02] border-b border-white/5 text-[9px] font-mono uppercase tracking-widest text-cream/40">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3 text-gold/40" /> {horse.height?.toFixed(1)}HH
            </span>
            <span className="flex items-center gap-1">
              <Weight className="h-3 w-3 text-gold/40" /> {Math.round(horse.weight ?? 0)}KG
            </span>
          </div>
          <div className="flex items-center gap-1">
            <HeartPulse className="h-3 w-3 text-destructive/40" />
            <span className={getInjuryColor(horse.injuryProneness)}>
              {getInjuryLabel(horse.injuryProneness)}
            </span>
          </div>
        </div>

        <HorseStatsPanel
          horse={horse}
          ovr={ovr}
          gradeColor={gradeColor}
          sparklineData={sparklineData}
          isAdvanced={isAdvanced}
        />

        <HorseMetaPanel
          horse={horse}
          isAdvanced={isAdvanced}
          onToggleView={() => setIsAdvanced((v) => !v)}
        />

        <HorseActionFooter horse={horse} />
      </CardContent>
    </Card>
  );
}
