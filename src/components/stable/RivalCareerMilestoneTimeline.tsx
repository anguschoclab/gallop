import { CircleDollarSign, Flag, Gauge, Medal, Trophy } from "lucide-react";
import { gameCalendarDate } from "@/services/time/timeFacade";
import type { RivalMilestoneRecord } from "@/services/npcStables/npcStablesFacade";
import type { LucideIcon } from "lucide-react";

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
}: {
  milestones: RivalMilestoneRecord[];
}) {
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
          </li>
        );
      })}
    </ol>
  );
}
