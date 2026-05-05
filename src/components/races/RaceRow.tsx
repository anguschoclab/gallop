import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getGradeColorClass } from "@/core/race/grading";

interface RaceRowProps {
  race: any;
  onEnter?: () => void;
}

export function RaceRow({ race, onEnter }: RaceRowProps) {
  const ownedCount = race.entries.filter((e: any) => e.owned).length;
  const gradeLabel = race.graded?.grade;
  const gradeColor = gradeLabel ? getGradeColorClass(gradeLabel) : "";

  return (
    <Link
      to="/race-browser"
      search={{ raceId: race.id }}
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group",
        ownedCount > 0 && "border-success/30 bg-success/5"
      )}
    >
      <div className="w-12 text-center shrink-0">
        <div className="text-xs text-muted-foreground uppercase tracking-tighter">Day</div>
        <div className="text-lg font-bold tabular-nums leading-none">{race.day}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {gradeLabel && (
            <Badge variant="outline" className={cn("h-4 px-1 text-[9px] font-bold", gradeColor)}>
              {gradeLabel}
            </Badge>
          )}
          <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{race.name}</h3>
          {ownedCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span className="truncate">{race.graded?.track || "Local Track"}</span>
          <span>{race.distance}m</span>
          <span>{race.surface}</span>
          <span>{race.raceClass}</span>
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-4">
        <div>
          <div className="text-sm font-bold tabular-nums">${race.purse.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground tabular-nums">{race.entries.length}/{race.fieldSize} full</div>
        </div>
        {ownedCount === 0 && (
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-[10px] uppercase font-black px-4 hover:bg-primary hover:text-primary-foreground" 
            onClick={(e) => { e.preventDefault(); onEnter?.(); }}
          >
            Enter
          </Button>
        )}
      </div>
    </Link>
  );
}
