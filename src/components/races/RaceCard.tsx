import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGradeColorClass } from "@/core/race/grading";

interface RaceCardProps {
  race: any;
  onEnter?: () => void;
}

export function RaceCard({ race, onEnter }: RaceCardProps) {
  const ownedCount = race.entries.filter((e: any) => e.owned).length;
  const gradeLabel = race.graded?.grade;
  const gradeColor = gradeLabel ? getGradeColorClass(gradeLabel) : "bg-muted text-muted-foreground";

  return (
    <Card className={cn("overflow-hidden hover:bg-t700 transition-colors border-gold-muted", ownedCount > 0 && "border-success/30 bg-success/5")}>
      <CardContent className="p-0">
        <Link to="/race-browser" search={{ raceId: race.id }} className="block p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {gradeLabel && (
                  <Badge variant="outline" className={cn("h-5 px-1 text-[10px] font-bold", gradeColor)}>
                    {gradeLabel}
                  </Badge>
                )}
                <h3 className="font-bold text-base leading-tight truncate max-w-[180px] font-[family-name:var(--font-display)]">{race.name}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {race.graded?.track || "Local Track"}</span>
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {race.country}</span>
              </div>
            </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-sm font-bold tabular-nums font-[family-name:var(--font-mono)]">${race.purse.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Purse</div>
              {ownedCount === 0 && (
                <Button 
                  size="sm" 
                  className="mt-2 h-7 text-[10px] uppercase font-black px-3" 
                  onClick={(e) => { e.preventDefault(); onEnter?.(); }}
                >
                  Enter
                </Button>
              )}
            </div>

          <div className="flex items-center justify-between pt-2 border-t border-gold-muted text-[11px]">
            <div className="flex gap-3 text-muted-foreground tabular-nums">
              <span>{race.distance}m</span>
              <span>{race.surface}</span>
              <span>{race.raceClass}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tabular-nums font-[family-name:var(--font-mono)]">Day {race.day}</span>
              {ownedCount > 0 && (
                <Badge variant="default" className="h-4 px-1 text-[9px] bg-success text-t950">
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
