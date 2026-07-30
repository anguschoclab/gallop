import { useState } from "react";
import type { EligibleRaceRow } from "@/hooks/race/useHorseEligibleRaces";
import type { Race } from "@/game/types";
import { formatCurrency } from "@/core/common/formatting";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RaceEntry } from "@/components/race/RaceEntry";
import { cn } from "@/lib/cn";
import { CheckCircle2, LogIn, ArrowUpRight, Search, FastForward } from "lucide-react";
import { toast } from "sonner";

interface EligibleRaceListProps {
  rows: EligibleRaceRow[];
  horseName: string;
  onEnterRace: (raceId: string) => { ok: boolean; reason?: string };
  firstEligibleRace?: Race;
  onAdvanceToDay?: (targetDay: number) => void;
}

export function EligibleRaceList({
  rows,
  horseName,
  onEnterRace,
  firstEligibleRace,
  onAdvanceToDay,
}: EligibleRaceListProps) {
  const [dialogRace, setDialogRace] = useState<Race | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-muted/40 p-8 text-center">
        <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="font-medium text-cream">No eligible races in the next 30 days</p>
        {firstEligibleRace && onAdvanceToDay ? (
          <div className="mt-4 rounded-lg border border-success/20 bg-success/5 p-4">
            <p className="text-sm text-cream/70">
              First eligible race:{" "}
              <span className="font-semibold text-cream">{firstEligibleRace.name}</span>
            </p>
            <p className="text-xs text-cream/50 mt-1">
              Day {firstEligibleRace.day} ({gameCalendarDate(firstEligibleRace.day)})
            </p>
            <Button
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => onAdvanceToDay(firstEligibleRace.day)}
            >
              <FastForward className="h-3.5 w-3.5" />
              Advance to Day {firstEligibleRace.day}
            </Button>
          </div>
        ) : (
          <p className="text-sm mt-1 text-muted-foreground">
            Check energy levels or try the Race Browser for a wider view.
          </p>
        )}
      </div>
    );
  }

  const handleEnter = (row: EligibleRaceRow) => {
    if (row.requiresDialog) {
      setDialogRace(row.race);
      return;
    }
    const result = onEnterRace(row.race.id);
    if (result.ok) {
      toast.success(`${horseName} entered ${row.race.name}`);
    } else {
      toast.error(`Entry failed: ${result.reason ?? "Unknown error"}`);
    }
  };

  return (
    <>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
        {rows.map((row) => {
          const grade = row.race.graded?.grade;
          return (
            <div
              key={row.race.id}
              className={cn(
                "rounded-lg border px-4 py-3 transition-colors",
                row.isEntered
                  ? "border-success/30 bg-success/5"
                  : "border-muted/30 hover:border-muted/50",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-cream truncate">
                      {row.race.name}
                    </span>
                    {grade && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 font-mono font-bold"
                      >
                        {grade}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-cream/50">
                    <span>Day {row.race.day}</span>
                    <span>{row.race.distance}m</span>
                    {row.race.surface && <span>{row.race.surface}</span>}
                    <span className="text-cream/40">Purse {formatCurrency(row.race.purse)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-cream/40">
                    <span>Entry {formatCurrency(row.entryFee)}</span>
                    <span>·</span>
                    <span>Jockey {formatCurrency(row.estimatedJockeyFee)}</span>
                    <span>·</span>
                    <span>Transport {formatCurrency(row.transportCost)}</span>
                    <span className="text-cream/60 font-bold">
                      = {formatCurrency(row.totalCost)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {row.isEntered ? (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="inline-block cursor-not-allowed">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                              className="gap-1.5 text-success pointer-events-none"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Entered
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Horse is already entered in this race</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : row.requiresDialog ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnter(row)}
                      className="gap-1.5"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleEnter(row)} className="gap-1.5">
                      <LogIn className="h-3.5 w-3.5" />
                      Enter
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {dialogRace && (
        <RaceEntry race={dialogRace} isOpen={!!dialogRace} onClose={() => setDialogRace(null)} />
      )}
    </>
  );
}
