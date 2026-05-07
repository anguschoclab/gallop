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
        "flex items-center gap-4 p-3 rounded-lg border border-gold-muted bg-t800 hover:bg-t700 transition-colors group",
        ownedCount > 0 && "border-success/30 bg-success/5",
      )}
    >
      <div className="w-12 text-center shrink-0">
        <div className="text-xs text-cream-muted uppercase tracking-tighter font-[family-name:var(--font-mono)] tabular-nums">
          Day
        </div>
        <div className="text-lg font-bold tabular-nums leading-none font-[family-name:var(--font-mono)]">
          {race.day}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {gradeLabel && (
            <Badge variant="outline" className={cn("h-4 px-1 text-[9px] font-bold", gradeColor)}>
              {gradeLabel}
            </Badge>
          )}
          <h3 className="font-bold text-sm truncate group-hover:text-gold transition-colors font-[family-name:var(--font-display)]">
            {race.name}
          </h3>
          {ownedCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-cream-muted tabular-nowrap">
          <span className="truncate">{race.graded?.track || "Local Track"}</span>
          <span>{race.distance}m</span>
          <span>{race.surface}</span>
          <span className="truncate">{race.raceClass}</span>
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-4">
        <div>
          <div className="text-sm font-bold tabular-nums font-[family-name:var(--font-mono)]">
            ${race.purse.toLocaleString()}
          </div>
          <div className="text-[10px] text-cream-muted tabular-nums font-[family-name:var(--font-mono)]">
            {race.entries.length}/{race.fieldSize} full
          </div>
        </div>
        {ownedCount === 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[10px] uppercase font-black px-4 hover:bg-gold hover:text-t950"
            onClick={(e) => {
              e.preventDefault();
              onEnter?.();
            }}
          >
            Enter
          </Button>
        )}
      </div>
    </Link>
  );
}
