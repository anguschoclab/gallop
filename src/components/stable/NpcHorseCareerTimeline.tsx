import { CircleDollarSign, Flag, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { gameCalendarDate } from "@/services/calendar/calendarFacade";
import {
  buildNpcCareerTimeline,
  careerStageLabel,
  type NpcCareerTimelineEvent,
} from "@/services/npc/npcFacade";
import { formatCurrency } from "@/lib/formatting";
import type { Horse } from "@/game/types";
import { cn } from "@/lib/cn";

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function eventIcon(event: NpcCareerTimelineEvent) {
  if (event.kind === "stage") return Flag;
  return event.won ? Trophy : CircleDollarSign;
}

export function NpcHorseCareerTimeline({ horse, day }: { horse: Horse; day: number }) {
  const events = buildNpcCareerTimeline(horse, day);

  if (events.length === 0) {
    return (
      <div className="border-t border-border/30 px-4 py-5 text-center font-mono text-[10px] uppercase text-cream-muted">
        No off-screen career events yet
      </div>
    );
  }

  return (
    <div className="border-t border-border/30 bg-background/35 px-4 py-4">
      <ol className="relative ml-2 border-l border-border/60 pl-5">
        {events.map((event, index) => {
          const Icon = eventIcon(event);
          return (
            <li key={event.id} className={cn("relative", index < events.length - 1 && "pb-4")}>
              <span
                className={cn(
                  "absolute -left-[29px] top-0 flex h-4 w-4 items-center justify-center rounded-full border bg-card",
                  event.kind === "start" && event.won
                    ? "border-gold text-gold"
                    : "border-border text-cream-muted",
                )}
                aria-hidden="true"
              >
                <Icon className="h-2.5 w-2.5" />
              </span>

              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div>
                  {event.kind === "stage" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-cream">
                        Entered {careerStageLabel(event.stage)} stage
                      </span>
                      <Badge variant="outline" className="rounded-none text-[9px] uppercase">
                        Age {event.age}
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            event.won ? "text-gold" : "text-cream",
                          )}
                        >
                          {event.won ? "Won" : `${ordinal(event.position)} finish`} ·{" "}
                          {event.raceName}
                        </span>
                        {(event.grade || event.raceClass) && (
                          <Badge variant="outline" className="rounded-none text-[9px] uppercase">
                            {event.grade ?? event.raceClass}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10px] text-cream-muted">
                        <span>
                          Finish {event.position}
                          {event.fieldSize ? `/${event.fieldSize}` : ""}
                        </span>
                        <span className={event.payout > 0 ? "text-success" : undefined}>
                          Payout {formatCurrency(event.payout)}
                        </span>
                        <span>Age {event.age}</span>
                        <span>{careerStageLabel(event.stage)}</span>
                      </div>
                    </>
                  )}
                </div>
                <time className="shrink-0 font-mono text-[10px] tabular-nums text-cream-muted">
                  {gameCalendarDate(event.day)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
