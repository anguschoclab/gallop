import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { ChevronRight } from "lucide-react";

const SLOT_STATUS_COLORS: Record<string, string> = {
  planned: "bg-t700 text-cream",
  entered: "bg-warning text-t950",
  completed: "bg-success text-t950",
  skipped: "bg-t600 text-cream-muted",
  cancelled: "bg-destructive text-t950",
};

function SlotStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SLOT_STATUS_COLORS[status] ?? "bg-t700 text-cream-muted"}`}
    >
      {status}
    </span>
  );
}

interface CampaignSlotListProps {
  slots: any[];
  getRace: (raceId: string) => any;
}

export function CampaignSlotList({ slots, getRace }: CampaignSlotListProps) {
  if (slots.length === 0) {
    return (
      <p className="text-xs text-cream-muted italic">
        No upcoming slots — slots are refreshed every 7 days automatically.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-cream-muted uppercase tracking-wide mb-2">
        Upcoming races
      </p>
      {slots.map((slot: any, si: number) => {
        const race = slot.raceId ? getRace(slot.raceId) : undefined;
        return (
          <div
            key={si}
            className="flex items-center justify-between py-1.5 px-3 rounded-md bg-t700 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-cream-muted tabular-nums w-20">
                {gameCalendarDate(slot.dayTarget)}
              </span>
              <span className="font-medium truncate max-w-[180px]">
                {race?.name ?? slot.raceKey ?? "TBD"}
              </span>
              <Badge variant="outline" className="text-xs capitalize border-gold-muted text-cream">
                {slot.role}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <SlotStatusBadge status={slot.status} />
              {race && (
                <Link
                  to="/race/$raceId"
                  params={{ raceId: race.id }}
                  className="text-cream-muted hover:text-cream"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
