import type { Horse } from "@/game/types";
import { Link } from "@tanstack/react-router";
import { shallow } from "zustand/shallow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateOverallRating } from "@/core/horse/stats";
import { getDisplayableStats, getScoutStatus } from "@/game/scouting";
import { genderSymbol, isMaleHorse } from "@/core/horse/gender";
import { getCoatColor, getInjuryColor, getInjuryLabel } from "@/core/horse/uiHelpers";
import { useGame } from "@/game/store";
import { SilkDot } from "./SilkDot";
import { NumericValue, StatBar } from "./HorseBits";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import {
  Trophy,
  Zap,
  TrendingUp,
  Activity,
  Calendar,
  Eye,
  Ruler,
  Weight,
  HeartPulse,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HorseCardProps {
  horse: Horse;
  variant?: "full" | "compact" | "scout";
  showScoutInfo?: boolean;
  onClick?: () => void;
  className?: string;
}

export function HorseCard({
  horse,
  variant = "full",
  showScoutInfo = false,
  onClick,
  className = "",
}: HorseCardProps) {
  const scoutReports = (useGame as any)((s) => s.scoutReports, shallow);
  const day = useGame((s) => s.day);
  const ovr = calculateOverallRating(horse);

  const scoutStatus =
    showScoutInfo && horse.stableId ? getScoutStatus(horse, scoutReports, day) : null;
  const displayStats =
    showScoutInfo && horse.stableId ? getDisplayableStats(horse, scoutReports, day) : null;

  const genderColor =
    horse.gender === "gelding"
      ? "text-cream/40"
      : isMaleHorse(horse.gender)
        ? "text-blue-400"
        : "text-pink-400";

  // Velocity Sparkline Data
  const sparklineData =
    horse.raceHistory
      ?.filter((h) => typeof h.beyer === "number")
      .slice(-8)
      .map((h, i) => ({ idx: i, beyer: h.beyer! })) || [];

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "bg-slate-900/40 border-white/5 rounded-none hover:border-gold/40 transition-all duration-300 relative overflow-hidden group cursor-pointer shadow-xl",
          className,
        )}
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gold/10 group-hover:bg-gold transition-colors z-10" />
        <CardContent className="p-3 pl-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
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
                <span>OVR: {ovr}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              className={cn(
                "text-[9px] font-mono h-4 rounded-none px-1 border border-white/5",
                horse.energy > 50 ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
              )}
            >
              E:{horse.energy}%
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

  if (variant === "scout") {
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
                      {isUnknown ? "---" : Math.round(value)}
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
                  ? ovr
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

  // Full Variant - "Horse Profile"
  return (
    <Card
      className={cn(
        "bg-slate-900/60 border-white/5 rounded-none shadow-2xl relative overflow-hidden group flex flex-col h-full",
        onClick && "cursor-pointer hover:border-gold/40 transition-all duration-300",
        className,
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gold/20 group-hover:bg-gold transition-colors z-10" />

      <CardHeader className="p-5 border-b border-white/5 bg-black/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
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
              <Weight className="h-3 w-3 text-gold/40" /> {Math.round(horse.weight)}KG
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
              <div className="space-y-2">
                <StatBar label="SPD" value={horse.stats.speed} />
                <StatBar label="STA" value={horse.stats.stamina} />
                <StatBar label="ACC" value={horse.stats.acceleration} />
                <StatBar label="CON" value={horse.stats.consistency} />
              </div>
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
                    BEYER
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
                OVR Rating
              </span>
              <span className="text-lg font-mono font-black text-cream">{ovr}</span>
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

          {(horse.runningStyle || horse.conformation) && (
            <div className="flex flex-wrap gap-1.5">
              {horse.runningStyle && (
                <Badge
                  variant="outline"
                  className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
                >
                  STY: {horse.runningStyle.replace("-", " ")}
                </Badge>
              )}
              {horse.conformation && (
                <Badge
                  variant="outline"
                  className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
                >
                  CNF: {horse.conformation}
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

export default HorseCard;
