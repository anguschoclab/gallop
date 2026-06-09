import type { Horse } from "@/game/types";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Activity,
  Calendar,
  Eye,
  Ruler,
  Weight,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { scoutGrade } from "@/core/horse/grading";
import { genderSymbol } from "@/core/horse/gender";
import { getCoatColor, getInjuryColor, getInjuryLabel } from "@/core/horse/uiHelpers";
import { SilkDot } from "@/components/SilkDot";
import { HorsePortraitBadge } from "@/components/horse/HorsePortrait";
import { StatBar } from "@/components/horse/HorseBits";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import type { useHorseCard } from "@/hooks/useHorseCard";

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
                      <Trophy className="h-2.5 w-2.5" /> F_{horse.fame}
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

        <div className="p-5 flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Stats Block */}
            <div className="space-y-3">
              <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Core_Specs
              </div>
              {isAdvanced ? (
                <div className="space-y-2">
                  <StatBar label="SPD" value={horse.stats.speed} />
                  <StatBar label="STA" value={horse.stats.stamina} />
                  <StatBar label="ACC" value={horse.stats.acceleration} />
                  <StatBar label="CON" value={horse.stats.consistency} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-mono">
                  <span className="text-cream/40 uppercase tracking-wide">
                    SPD{" "}
                    <span className={cn("font-black", gradeColor(horse.stats.speed))}>
                      {scoutGrade(horse.stats.speed)}
                    </span>
                  </span>
                  <span className="text-cream/40 uppercase tracking-wide">
                    STA{" "}
                    <span className={cn("font-black", gradeColor(horse.stats.stamina))}>
                      {scoutGrade(horse.stats.stamina)}
                    </span>
                  </span>
                  <span className="text-cream/40 uppercase tracking-wide">
                    ACC{" "}
                    <span className={cn("font-black", gradeColor(horse.stats.acceleration))}>
                      {scoutGrade(horse.stats.acceleration)}
                    </span>
                  </span>
                  <span className="text-cream/40 uppercase tracking-wide">
                    CON{" "}
                    <span className={cn("font-black", gradeColor(horse.stats.consistency))}>
                      {scoutGrade(horse.stats.consistency)}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Data Viz Block: Velocity Sparkline or Pot/Form */}
            <div className="space-y-3 pl-4 border-l border-white/5 flex flex-col">
              <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest flex items-center gap-1">
                <Activity className="h-3 w-3" /> Perf_Telemetry
              </div>

              {sparklineData.length > 2 ? (
                <div className="flex-1 min-h-[60px] relative mt-1 bg-black/20 border border-white/5 rounded-sm p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                      <Line
                        type="step"
                        dataKey="beyer"
                        stroke="#d4af37"
                        strokeWidth={1.5}
                        dot={{ r: 1.5, fill: "#020617", stroke: "#d4af37" }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1 left-1.5 text-[8px] font-mono text-gold/40">
                    <JargonTooltip term="Beyer">BEYER</JargonTooltip>
                  </div>
                  <div className="absolute bottom-1 right-1.5 text-[9px] font-mono font-black text-gold">
                    {sparklineData[sparklineData.length - 1].beyer}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center space-y-3 bg-black/20 border border-white/5 rounded-sm p-3">
                  <div className="flex justify-between items-end border-b border-white/5 pb-1">
                    <span className="text-[9px] font-mono text-cream/40 uppercase">Energy</span>
                    <span
                      className={cn(
                        "text-xs font-mono font-black",
                        horse.energy > 50 ? "text-success" : "text-warning",
                      )}
                    >
                      {horse.energy}%
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-mono text-cream/40 uppercase">Form</span>
                    <span
                      className={cn(
                        "text-xs font-mono font-black",
                        horse.form > 0
                          ? "text-success"
                          : horse.form < 0
                            ? "text-destructive"
                            : "text-cream",
                      )}
                    >
                      {horse.form > 0 ? "+" : ""}
                      {horse.form}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between bg-black/40 p-2 rounded-sm border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase text-cream/30 tracking-widest">
                <JargonTooltip term="OVR">OVR</JargonTooltip> Rating
              </span>
              <span
                className={cn(
                  "font-mono font-black text-cream",
                  isAdvanced ? "text-lg" : "text-xl",
                )}
              >
                {isAdvanced ? ovr : scoutGrade(ovr)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase text-cream/30 tracking-widest">
                POTENTIAL
              </span>
              <span className="text-sm font-mono font-black text-gold-muted">
                {horse.potential}
              </span>
            </div>
          </div>

          {(horse.runningStyle || horse.conformation || horse.distanceAptitude) && (
            <div className="flex flex-wrap gap-1.5">
              {horse.runningStyle && (
                <Badge
                  variant="outline"
                  className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
                >
                  STY: {horse.runningStyle.replace("-", " ")}
                </Badge>
              )}
              {horse.distanceAptitude != null && (
                <Badge
                  variant="outline"
                  className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
                >
                  DIST: {Math.round(horse.distanceAptitude)}m
                </Badge>
              )}
              {horse.surfaceAptitude && (
                <Badge
                  variant="outline"
                  className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
                >
                  SURF:{" "}
                  {(() => {
                    const best = Object.entries(horse.surfaceAptitude).sort(
                      (a, b) => b[1] - a[1],
                    )[0];
                    return best ? `${best[0]} (${Math.round(best[1])})` : "—";
                  })()}
                </Badge>
              )}
              {horse.conformation && (
                <Badge
                  variant="outline"
                  className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
                >
                  CNF: {isAdvanced ? horse.conformation : scoutGrade(horse.conformation)}
                </Badge>
              )}
            </div>
          )}

          {(horse.sireName || horse.damName) && (
            <div className="pt-3 border-t border-white/5 space-y-1">
              <div className="text-[8px] font-black uppercase text-pink-500/40 tracking-widest">
                Genetic Lineage
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-cream/60 uppercase truncate">
                <span className="truncate">{horse.sireName || "UNKNOWN"}</span>
                <span className="text-pink-500/40">×</span>
                <span className="truncate">{horse.damName || "UNKNOWN"}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setIsAdvanced((v) => !v)}
              className="text-[9px] font-mono uppercase tracking-widest text-cream/20 hover:text-cream/60 transition-colors"
            >
              {isAdvanced ? "Simple view" : "Advanced metrics"}
            </button>
          </div>
        </div>

        {/* Action Footer */}
        {horse.owned && (
          <div className="p-3 bg-black/40 border-t border-white/5 flex gap-2">
            <Link
              to="/stable/$horseId"
              params={{ horseId: horse.id }}
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                className="w-full h-8 text-[9px] font-black uppercase tracking-widest border-white/10 hover:bg-gold/10 hover:text-gold hover:border-gold/30 rounded-none text-cream/60"
              >
                <Eye className="h-3 w-3 mr-1.5" /> Dossier
              </Button>
            </Link>
            <Link to="/scheduler" className="flex-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                className="w-full h-8 text-[9px] font-black uppercase tracking-widest border-white/10 hover:bg-blue-400/10 hover:text-blue-400 hover:border-blue-400/30 rounded-none text-cream/60"
              >
                <Calendar className="h-3 w-3 mr-1.5" /> Deploy
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
