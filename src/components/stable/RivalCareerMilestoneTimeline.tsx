import { CircleDollarSign, Flag, Gauge, Medal, Trophy } from "lucide-react";
import { gameCalendarDate } from "@/services/calendar/calendarFacade";
import type { RivalMilestoneRecord } from "@/services/npc/npcFacade";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";

const linkCls = "text-[10px] uppercase tracking-wide text-gold hover:underline";

const MILESTONE_ICON: Record<RivalMilestoneRecord["kind"], LucideIcon> = {
  debut: Flag,
  breakthrough_win: Trophy,
  earnings: CircleDollarSign,
  peak_transition: Gauge,
  retirement: Medal,
};

const MILESTONE_LABEL: Record<RivalMilestoneRecord["kind"], string> = {
  debut: "Debut",
  breakthrough_win: "Breakthrough",
  earnings: "Earnings",
  peak_transition: "Career stage",
  retirement: "Retirement",
};

export function RivalCareerMilestoneTimeline({
  milestones,
  horseId,
}: {
  milestones: RivalMilestoneRecord[];
  horseId?: string;
}) {
  const races = useGame((s) => s.races);
  const ledger = useGame((s) => s.trackLedger);
  const trackFor = (raceId?: string) => {
    if (!raceId) return undefined;
    const r = races[raceId];
    const id = r?.graded?.trackId ?? r?.trackId;
    if (id) return id;
    return ledger?.find((e) => e.raceId === raceId)?.trackId;
  };
  if (milestones.length === 0) {
    return <span className="text-cream-muted">No milestones yet</span>;
  }

  return (
    <ol className="relative ml-1 border-l border-border/70 pl-4 text-left">
      {milestones.map((milestone, index) => {
        const Icon = MILESTONE_ICON[milestone.kind];
        return (
          <li
            key={milestone.key}
            className={index === milestones.length - 1 ? "relative" : "relative pb-3"}
          >
            <span
              className={`absolute -left-[25px] top-0 flex h-4 w-4 items-center justify-center rounded-full border bg-card ${
                milestone.announced ? "border-border text-cream-muted" : "border-gold text-gold"
              }`}
              aria-hidden="true"
            >
              <Icon className="h-2.5 w-2.5" />
            </span>
            <div className="text-[10px] font-medium uppercase text-cream-muted">
              {MILESTONE_LABEL[milestone.kind]}
            </div>
            <div
              className={milestone.announced ? "leading-snug text-cream" : "leading-snug text-gold"}
            >
              {milestone.title}
            </div>
            <div className="mt-0.5 font-mono text-[10px] tabular-nums text-cream-muted">
              {milestone.day === null ? "Date unknown" : gameCalendarDate(milestone.day)}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {milestone.raceId && races[milestone.raceId] && (
                <Link
                  to="/race/$raceId"
                  params={{ raceId: milestone.raceId }}
                  className={linkCls}
                  title={milestone.raceName}
                >
                  {milestone.kind === "retirement" ? "Last race" : "Race result"}
                </Link>
              )}
              {trackFor(milestone.raceId) && (
                <Link
                  to="/track-history"
                  search={{ track: trackFor(milestone.raceId) }}
                  className={linkCls}
                >
                  Course
                </Link>
              )}
              {horseId && (
                <Link to="/stable/$horseId" params={{ horseId }} className={linkCls}>
                  {milestone.kind === "retirement" ? "Retirement record" : "Career record"}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
