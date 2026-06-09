import { StatBar } from "@/components/horse/HorseBits";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { scoutGrade } from "@/core/horse/grading";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { Horse } from "@/game/types";
import { ShieldCheck, Activity } from "lucide-react";

interface HorseStatsPanelProps {
  horse: Horse;
  ovr: number;
  gradeColor: (val: number) => string;
  sparklineData: Array<{ beyer: number }>;
  isAdvanced: boolean;
}

export function HorseStatsPanel({ horse, ovr, gradeColor, sparklineData, isAdvanced }: HorseStatsPanelProps) {
  return (
    <div className="p-5 flex-1 space-y-6">
      <div className="grid grid-cols-2 gap-4">
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
          <span className={cn("font-mono font-black text-cream", isAdvanced ? "text-lg" : "text-xl")}>
            {isAdvanced ? ovr : scoutGrade(ovr)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black uppercase text-cream/30 tracking-widest">
            POTENTIAL
          </span>
          <span className="text-sm font-mono font-black text-gold-muted">{horse.potential}</span>
        </div>
      </div>
    </div>
  );
}
