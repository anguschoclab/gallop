import type { Horse } from "@/game/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateOverallRating } from "@/core/horse/stats";
import { getDisplayableStats, getScoutStatus } from "@/game/scouting";
import { genderSymbol, isMaleHorse } from "@/core/horse/gender";
import { JargonTooltip } from "./ui/JargonTooltip";
import { useGame } from "@/game/store";
import { SilkDot } from "./SilkDot";
import { NumericValue, StatBar } from "./HorseBits";
import {
  Trophy,
  Zap,
  TrendingUp,
  Activity,
  Dna,
  Calendar,
  User,
  Building2,
  Eye,
  Ruler,
  Weight,
  HeartPulse,
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
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const ovr = calculateOverallRating(horse);

  // Scout info if applicable
  const scoutStatus =
    showScoutInfo && horse.stableId ? getScoutStatus(horse, scoutReports, day) : null;
  const displayStats =
    showScoutInfo && horse.stableId ? getDisplayableStats(horse, scoutReports, day) : null;

  // Gender icon
  const getGenderIcon = () => genderSymbol(horse.gender);

  const getGenderColor = () => {
    if (horse.gender === "gelding") return "text-cream-muted";
    return isMaleHorse(horse.gender) ? "text-chart-1" : "text-chart-5";
  };

  const genderIcon = getGenderIcon();
  const genderColor = getGenderColor();

  // Lifecycle status indicator (retired/deceased)
  const getLifecycleStatus = () => {
    if (horse.lifecycleStatus === "retired") {
      return <Badge className="bg-gold/20 text-gold border-gold/30">Retired</Badge>;
    }
    if (horse.lifecycleStatus === "deceased") {
      return (
        <Badge className="bg-destructive/20 text-destructive border-destructive/30">Deceased</Badge>
      );
    }
    return null;
  };

  // Health status indicator
  const getHealthStatus = () => {
    if (!horse.healthStatus || horse.healthStatus === "healthy") return null;
    const statusConfig: Record<string, { color: string; label: string }> = {
      covering_sickness: { color: "bg-destructive/10 text-destructive", label: "Dourine" },
      other_illness: { color: "bg-chart-4/10 text-chart-4", label: "Ill" },
      recovering: { color: "bg-chart-2/10 text-chart-2", label: "Recovering" },
    };
    const config = statusConfig[horse.healthStatus] || {
      color: "bg-t700",
      label: horse.healthStatus,
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Dynamic Form: Condition status indicator based on recoveryPoints
  const getConditionStatus = () => {
    const recoveryPoints = horse.recoveryPoints ?? 100;
    let label: string;
    let color: string;

    if (recoveryPoints > 80) {
      label = "Peaking";
      color = "bg-chart-1/10 text-chart-1";
    } else if (recoveryPoints >= 50) {
      label = "Fresh";
      color = "bg-chart-2/10 text-chart-2";
    } else if (recoveryPoints >= 30) {
      label = "Fatigued";
      color = "bg-chart-3/10 text-chart-3";
    } else {
      label = "Exhausted";
      color = "bg-destructive/10 text-destructive";
    }

    return <Badge className={color}>{label}</Badge>;
  };

  // Dynamic Form: Bounce risk indicator
  const getBounceRiskIndicator = () => {
    if (!horse.lastBeyer || !horse.lastRaceDay || !day) return null;
    
    const daysSinceLastRace = day - horse.lastRaceDay;
    const beyerHistory = horse.raceHistory
      .filter((r) => r.beyer !== undefined)
      .map((r) => r.beyer!);
    const avgBeyer = beyerHistory.length > 0
      ? beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length
      : 80;
    
    // Bounce condition: lastBeyer > avgBeyer + 15 and raced within 28 days
    if (horse.lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28) {
      return <Badge className="bg-gold/10 text-gold border-gold/30">Bounce Risk</Badge>;
    }
    
    return null;
  };

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "hover:bg-t700 transition-colors cursor-pointer border-gold-muted",
          className,
        )}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Identity: SilkDot + Name */}
            <SilkDot color={getCoatColor(horse.coatColor)} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(genderColor, "text-sm")}>{genderIcon}</span>
                <span className="font-semibold text-cream font-[family-name:var(--font-display)] truncate">
                  {horse.name}
                </span>
              </div>
              {/* Qualifiers */}
              <div className="text-xs text-cream-muted flex items-center gap-2">
                <NumericValue value={Math.floor(horse.age)} suffix="yo" className="font-semibold" />
                <span>·</span>
                <JargonTooltip term="OVR">
                  <span className="font-[family-name:var(--font-body)]">OVR</span>{" "}
                  <NumericValue value={ovr} />
                </JargonTooltip>
                {horse.stableId && (
                  <>
                    <span>·</span>
                    <span className="text-chart-4">
                      <NumericValue value={horse.fame} prefix="★ " />
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* Numbers */}
            <div className="flex flex-col items-end gap-1">
              <Badge className="text-xs bg-t700 text-cream">
                <Zap className="w-3 h-3 mr-1" />
                <NumericValue value={horse.energy} />
              </Badge>
              {scoutStatus && (
                <Badge className={cn("text-xs", scoutStatus.color)}>{scoutStatus.icon}</Badge>
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
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SilkDot color={getCoatColor(horse.coatColor)} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(genderColor, "text-lg")}>{genderIcon}</span>
                  <span className="font-bold text-lg text-cream font-[family-name:var(--font-display)]">
                    {horse.name}
                  </span>
                </div>
                <div className="text-sm text-cream-muted flex items-center gap-2">
                  <NumericValue value={Math.floor(horse.age)} suffix=" years old" />
                  <span>·</span>
                  <span className="text-chart-4">
                    Fame: <NumericValue value={horse.fame} suffix="/100" />
                  </span>
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
            {["speed", "stamina", "acceleration", "consistency"].map((stat) => {
              const value = knownStats[stat as keyof typeof knownStats];
              const isUnknown = value === undefined;
              return (
                <div key={stat} className={isUnknown ? "opacity-50" : ""}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cream-muted capitalize">{stat}</span>
                    <span className="font-medium tabular-nums">
                      {isUnknown ? "???" : Math.round(value)}
                    </span>
                  </div>
                  <Progress value={isUnknown ? 0 : value} className="h-1.5" />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-cream-muted">Overall: </span>
              <span className="font-bold">
                {hasAllStats
                  ? ovr
                  : displayStats?.overallEstimate
                    ? `~${displayStats.overallEstimate}`
                    : "???"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-cream-muted">
              <Activity className="w-3 h-3" />
              <span className="tabular-nums">
                Form: {horse.form > 0 ? "+" : ""}
                {horse.form}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <Card
      className={cn(
        "hover:bg-t700 transition-colors border-gold-muted",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header - Design Bible: Identity | Qualifiers | Numbers */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <SilkDot color={getCoatColor(horse.coatColor)} size="lg" />
            <div>
              {/* Identity */}
              <div className="flex items-center gap-2">
                <span className={cn(genderColor, "text-lg")}>{genderIcon}</span>
                <span className="font-bold text-lg text-cream font-[family-name:var(--font-display)]">
                  {horse.name}
                </span>
                {getLifecycleStatus()}
                {getHealthStatus()}
                {getConditionStatus()}
                {getBounceRiskIndicator()}
              </div>
              {/* Qualifiers */}
              <div className="text-sm text-cream-muted flex items-center gap-2 flex-wrap font-[family-name:var(--font-body)]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <NumericValue value={Math.floor(horse.age)} suffix=" years old" />
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
                    <span className="text-chart-4 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      <NumericValue value={horse.fame} suffix=" fame" />
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Numbers */}
          <div className="flex flex-col items-end gap-1">
            <Badge className="flex items-center gap-1 bg-t700 text-cream">
              <Zap className="w-3 h-3" />
              <NumericValue value={horse.energy} suffix=" Energy" />
            </Badge>
            {horse.form !== 0 && (
              <Badge
                className={cn(
                  "text-xs flex items-center gap-1",
                  horse.form > 0
                    ? "bg-gold text-t950"
                    : "bg-destructive text-destructive-foreground",
                )}
              >
                <TrendingUp className="w-3 h-3" />
                <NumericValue
                  value={horse.form}
                  prefix={horse.form > 0 ? "+" : ""}
                  suffix=" Form"
                />
              </Badge>
            )}
          </div>
        </div>

        {/* Biometrics Strip */}
        <div className="flex items-center gap-4 mb-4 p-2 bg-t700 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-cream-muted" />
            <span className="font-medium">{horse.height?.toFixed(1)} hh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Weight className="w-3.5 h-3.5 text-cream-muted" />
            <span className="font-medium">{Math.round(horse.weight)} kg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full border border-gold-muted"
              style={{ backgroundColor: getCoatColor(horse.coatColor) }}
            />
            <span className="capitalize">{horse.coatColor?.replace("-", " ")}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <HeartPulse className="w-3.5 h-3.5 text-cream-muted" />
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
              <Activity className="w-4 h-4 text-cream-muted" />
              <JargonTooltip term="OVR" className="text-cream-muted">
                OVR
              </JargonTooltip>
              <span className="font-bold text-lg tabular-nums">{ovr}</span>
            </div>
            <div className="flex items-center gap-1">
              <Dna className="w-4 h-4 text-cream-muted" />
              <JargonTooltip term="Pot" className="text-cream-muted">
                Pot
              </JargonTooltip>
              <span className="font-semibold tabular-nums">{horse.potential}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-cream-muted">
            {horse.runningStyle && (
              <Badge variant="outline" className="text-xs capitalize">
                {horse.runningStyle.replace("-", " ")}
              </Badge>
            )}
            {horse.conformation && <span className="capitalize">{horse.conformation} form</span>}
          </div>
        </div>

        {/* Pedigree (if available) */}
        {(horse.sireName || horse.damName) && (
          <div className="mt-3 pt-3 border-t text-xs text-cream-muted">
            <div className="flex items-center gap-1 mb-1">
              <User className="w-3 h-3" />
              <span>Pedigree:</span>
            </div>
            <div className="flex gap-4">
              {horse.sireName && (
                <span>
                  Sire: <span className="font-medium">{horse.sireName}</span>
                </span>
              )}
              {horse.damName && (
                <span>
                  Dam: <span className="font-medium">{horse.damName}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stable info for NPC horses */}
        {horse.stableId && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-cream-muted">
              <Building2 className="w-3 h-3" />
              <span>Belongs to rival stable</span>
              {horse.lastScoutedDay && <span>· Last scouted Day {horse.lastScoutedDay}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getCoatColor(color?: string): string {
  // Use CSS custom properties defined in styles.css instead of hardcoded hex codes
  const map: Record<string, string> = {
    bay: "var(--coat-bay)",
    "dark-bay": "var(--coat-dark-bay)",
    black: "var(--coat-black)",
    chestnut: "var(--coat-chestnut)",
    gray: "var(--coat-gray)",
    palomino: "var(--coat-palomino)",
    buckskin: "var(--coat-buckskin)",
    roan: "var(--coat-roan)",
    white: "var(--coat-white)",
    "seal-brown": "var(--coat-seal-brown)",
    "liver-chestnut": "var(--coat-liver-chestnut)",
    dun: "var(--coat-dun)",
    grulla: "var(--coat-grulla)",
    champagne: "var(--coat-champagne)",
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
  if (!proneness) return "text-cream-muted";
  if (proneness < 0.06) return "text-success font-medium";
  if (proneness < 0.09) return "text-warning font-medium";
  return "text-destructive font-bold";
}

export default HorseCard;
