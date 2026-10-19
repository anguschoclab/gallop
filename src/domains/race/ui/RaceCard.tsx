import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { MapPin, AlertTriangle } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { JargonTooltip } from "@/domains/horse/ui/JargonTooltip";
import { gradeColor } from "@/domains/race/application/raceFacade";
import { useRaceCardOdds } from "@/domains/race/application/hooks/useRaceCardOdds";
import { formatCurrency } from "@/domains/race/application/raceFacade";
import { WeatherForecastStrip } from "@/domains/race/ui/WeatherForecastStrip";
import { BookmarkButton } from "@/domains/bookmarks/ui/BookmarkButton";
import type { Race } from "@/platform/game/types";

interface RaceCardProps {
  race: Race;
  onEnter?: () => void;
}

export function RaceCard({ race, onEnter }: RaceCardProps) {
  const ownedCount = race.entries.filter((e) => e.ownership?.type === "player").length;
  const gradeLabel = race.graded?.grade;
  const gradeColorClass = gradeLabel ? gradeColor(gradeLabel) : "bg-muted text-muted-foreground";
  const claimingPrice: number | undefined = race.claimingPrice;
  const isClaiming = claimingPrice !== undefined;

  const favoriteOdds = useRaceCardOdds(race);

  return (
    <Card
      className={cn(
        "overflow-hidden hover:bg-muted transition-colors border-border relative",
        ownedCount > 0 && "border-success/30 bg-success/5",
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <BookmarkButton
          type="race"
          id={race.id}
          label={race.name}
          subtitle={`${gradeLabel ?? "Race"} · ${race.graded?.track ?? ""}`.trim()}
        />
      </div>
      <CardContent className="p-0">
        <Link to="/race-browser" search={{ raceId: race.id }} className="block p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {gradeLabel && (
                  <Badge
                    variant="outline"
                    className={cn("h-5 px-1 text-[10px] font-bold", gradeColorClass)}
                  >
                    <JargonTooltip term={gradeLabel}>{gradeLabel}</JargonTooltip>
                  </Badge>
                )}
                <h3 className="font-bold text-base leading-tight truncate max-w-[180px] font-[family-name:var(--font-display)]">
                  {race.name}
                </h3>
                {/* D3 — Claiming badge */}
                {isClaiming && claimingPrice !== undefined && (
                  <Badge className="h-4 px-1.5 text-[9px] font-bold bg-warning/20 text-warning border border-warning/40 flex items-center gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <JargonTooltip term="Claiming">Claiming</JargonTooltip>{" "}
                    {formatCurrency(claimingPrice)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {race.graded?.track || "Local Track"}
                </span>
              </div>
              <WeatherForecastStrip
                trackId={race.trackId ?? race.graded?.trackId ?? race.graded?.track}
                trackCondition={race.trackCondition}
              />
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm font-bold tabular-nums font-[family-name:var(--font-mono)]">
              {formatCurrency(race.purse)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              <JargonTooltip term="Purse">Purse</JargonTooltip>
            </div>
            {ownedCount === 0 && (
              <Button
                size="sm"
                className="mt-2 h-7 text-[10px] uppercase font-black px-3"
                onClick={(e) => {
                  e.preventDefault();
                  onEnter?.();
                }}
              >
                Enter
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
            <div className="flex gap-3 text-muted-foreground tabular-nums">
              <span>{race.distance}m</span>
              <JargonTooltip term={race.surface || "Turf"}>{race.surface || "Turf"}</JargonTooltip>
              <span>{race.raceClass}</span>
              <span className="font-bold text-foreground">
                <JargonTooltip term="ML">ML</JargonTooltip>: {favoriteOdds}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tabular-nums font-[family-name:var(--font-mono)]">
                Day {race.day}
              </span>
              {ownedCount > 0 && (
                <Badge variant="default" className="h-4 px-1 text-[9px] bg-success text-background">
                  {ownedCount} Entered
                </Badge>
              )}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
