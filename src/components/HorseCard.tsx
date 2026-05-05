import type { Horse } from "@/game/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateOverallRating } from "@/core/horse/stats";
import { getDisplayableStats, getScoutStatus } from "@/game/scouting";
import { JargonTooltip } from "./ui/JargonTooltip";
import { useGame } from "@/game/store";
import { Trophy, Zap, TrendingUp, Activity, Dna, Calendar, User, Building2, Eye, Ruler, Weight, HeartPulse } from "lucide-react";

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
  className = ""
}: HorseCardProps) {
  const game = useGame();
  const ovr = calculateOverallRating(horse);
  
  // Scout info if applicable
  const scoutStatus = showScoutInfo && horse.stableId 
    ? getScoutStatus(horse, game.scoutReports, game.day)
    : null;
  const displayStats = showScoutInfo && horse.stableId
    ? getDisplayableStats(horse, game.scoutReports, game.day)
    : null;
  
  // Gender icon
  const getGenderIcon = () => {
    if (horse.gender === "gelding") return "⚲";
    return horse.gender === "colt" || horse.gender === "horse" ? "♂" : "♀";
  };
  const getGenderColor = () => {
    if (horse.gender === "gelding") return "text-slate-400";
    return horse.gender === "colt" || horse.gender === "horse" ? "text-chart-1" : "text-chart-5";
  };
  
  const genderIcon = getGenderIcon();
  const genderColor = getGenderColor();
  
  // Health status indicator
  const getHealthStatus = () => {
    if (!horse.healthStatus || horse.healthStatus === "healthy") return null;
    const statusConfig: Record<string, { color: string; label: string }> = {
      covering_sickness: { color: "bg-destructive/10 text-destructive", label: "Dourine" },
      other_illness: { color: "bg-chart-4/10 text-chart-4", label: "Ill" },
      recovering: { color: "bg-chart-2/10 text-chart-2", label: "Recovering" },
    };
    const config = statusConfig[horse.healthStatus] || { color: "bg-gray-100", label: horse.healthStatus };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (variant === "compact") {
    return (
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${className}`} onClick={onClick}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow"
              style={{ backgroundColor: horse.silk }}
            >
              {horse.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`${genderColor} text-sm`}>{genderIcon}</span>
                <span className="font-semibold truncate">{horse.name}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="font-semibold tabular-nums">{horse.age}yo</span>
                <span>·</span>
                <JargonTooltip term="OVR">OVR {ovr}</JargonTooltip>
                {horse.stableId && (
                  <>
                    <span>·</span>
                    <span className="text-chart-4 tabular-nums">★ {horse.fame}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {horse.energy}
              </Badge>
              {scoutStatus && (
                <Badge variant="outline" className={`text-xs ${scoutStatus.color}`}>
                  {scoutStatus.icon}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "scout") {
    // Scouting view - shows fog of war mechanics
    const knownStats = displayStats?.stats || {};
    const hasAllStats = Object.keys(knownStats).length === 4;
    
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow"
                style={{ backgroundColor: horse.silk }}
              >
                {horse.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`${genderColor} text-lg`}>{genderIcon}</span>
                  <span className="font-bold text-lg">{horse.name}</span>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="tabular-nums">{horse.age} years old</span>
                  <span>·</span>
                  <span className="text-chart-4 tabular-nums">Fame: {horse.fame}/100</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {scoutStatus && (
                <Badge className={scoutStatus.color}>
                  {scoutStatus.icon} {scoutStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            {['speed', 'stamina', 'acceleration', 'consistency'].map((stat) => {
              const value = knownStats[stat as keyof typeof knownStats];
              const isUnknown = value === undefined;
              return (
                <div key={stat} className={isUnknown ? "opacity-50" : ""}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground capitalize">{stat}</span>
                    <span className="font-medium tabular-nums">
                      {isUnknown ? "???" : value}
                    </span>
                  </div>
                  <Progress 
                    value={isUnknown ? 0 : value} 
                    className="h-1.5" 
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Overall: </span>
              <span className="font-bold">
                {hasAllStats ? ovr : displayStats?.overallEstimate ? `~${displayStats.overallEstimate}` : "???"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              <span className="tabular-nums">Form: {horse.form > 0 ? "+" : ""}{horse.form}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <Card className={`hover:shadow-md transition-shadow ${onClick ? "cursor-pointer" : ""} ${className}`} onClick={onClick}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow"
              style={{ backgroundColor: horse.silk }}
            >
              {horse.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`${genderColor} text-lg`}>{genderIcon}</span>
                <span className="font-bold text-lg">{horse.name}</span>
                {getHealthStatus()}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="tabular-nums">{horse.age} years old</span>
                </span>
                {horse.hemisphere && (
                  <>
                    <span>·</span>
                    <span>{horse.hemisphere}</span>
                  </>
                )}
                {horse.stableId && (
                  <>
                    <span>·</span>
                    <span className="text-chart-4 flex items-center gap-1 tabular-nums">
                      <Trophy className="w-3 h-3" />
                      {horse.fame} fame
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span className="tabular-nums">{horse.energy} Energy</span>
            </Badge>
            {horse.form !== 0 && (
              <Badge variant={horse.form > 0 ? "default" : "destructive"} className="text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span className="tabular-nums">{horse.form > 0 ? "+" : ""}{horse.form} Form</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Biometrics Strip */}
        <div className="flex items-center gap-4 mb-4 p-2 bg-muted/30 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{horse.height?.toFixed(1)} hh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Weight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{horse.weight} kg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: getCoatColor(horse.coatColor) }} />
            <span className="capitalize">{horse.coatColor?.replace("-", " ")}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <HeartPulse className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={getInjuryColor(horse.injuryProneness)}>
              {getInjuryLabel(horse.injuryProneness)}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatBar label="Speed" value={horse.stats.speed} />
          <StatBar label="Stamina" value={horse.stats.stamina} />
          <StatBar label="Acceleration" value={horse.stats.acceleration} />
          <StatBar label="Consistency" value={horse.stats.consistency} />
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-3 border-t text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <JargonTooltip term="OVR" className="text-muted-foreground">OVR</JargonTooltip>
              <span className="font-bold text-lg tabular-nums">{ovr}</span>
            </div>
            <div className="flex items-center gap-1">
              <Dna className="w-4 h-4 text-muted-foreground" />
              <JargonTooltip term="Pot" className="text-muted-foreground">Pot</JargonTooltip>
              <span className="font-semibold tabular-nums">{horse.potential}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {horse.runningStyle && (
              <Badge variant="outline" className="text-xs capitalize">
                {horse.runningStyle.replace("-", " ")}
              </Badge>
            )}
            {horse.conformation && (
              <span className="capitalize">{horse.conformation} form</span>
            )}
          </div>
        </div>

        {/* Pedigree (if available) */}
        {(horse.sireName || horse.damName) && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <User className="w-3 h-3" />
              <span>Pedigree:</span>
            </div>
            <div className="flex gap-4">
              {horse.sireName && <span>Sire: <span className="font-medium">{horse.sireName}</span></span>}
              {horse.damName && <span>Dam: <span className="font-medium">{horse.damName}</span></span>}
            </div>
          </div>
        )}

        {/* Stable info for NPC horses */}
        {horse.stableId && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span>Belongs to rival stable</span>
              {horse.lastScoutedDay && (
                <span>· Last scouted Day {horse.lastScoutedDay}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function getCoatColor(color?: string): string {
  // Use CSS custom properties defined in styles.css instead of hardcoded hex codes
  const map: Record<string, string> = {
    "bay": "var(--coat-bay)",
    "dark-bay": "var(--coat-dark-bay)",
    "black": "var(--coat-black)",
    "chestnut": "var(--coat-chestnut)",
    "gray": "var(--coat-gray)",
    "palomino": "var(--coat-palomino)",
    "buckskin": "var(--coat-buckskin)",
    "roan": "var(--coat-roan)",
    "white": "var(--coat-white)"
  };
  return map[color || "bay"] || "var(--coat-bay)";
}

function getInjuryLabel(proneness?: number): string {
  if (!proneness) return "Solid";
  if (proneness < 0.03) return "Iron Horse";
  if (proneness < 0.06) return "Durable";
  if (proneness < 0.09) return "Average";
  return "Fragile";
}

function getInjuryColor(proneness?: number): string {
  if (!proneness) return "text-muted-foreground";
  if (proneness < 0.06) return "text-success font-medium";
  if (proneness < 0.09) return "text-warning font-medium";
  return "text-destructive font-bold";
}

export default HorseCard;
