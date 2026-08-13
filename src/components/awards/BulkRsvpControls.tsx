import { useState } from "react";
import { useGameWithShallow, type StoreType } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  getRsvpDeadlineDay,
  isCeremonyHeld,
  type AwardCeremonyInvitation,
} from "@/core/awards/invitations";
import { REGION_AWARD_NAMES } from "@/core/awards/types";

export function BulkRsvpControls() {
  const day = useGameWithShallow((s: StoreType) => s.day);
  const invitations = useGameWithShallow((s: StoreType) => s.awardCeremonyInvitations ?? []);
  const bulkSetCeremonyRsvp = useGameWithShallow((s: StoreType) => s.bulkSetCeremonyRsvp);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pending = (invitations as AwardCeremonyInvitation[]).filter(
    (inv) => inv.rsvp === "pending" && !isCeremonyHeld(inv, day),
  );

  if (pending.length < 2) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pending.map((i) => i.id)));
  const deselectAll = () => setSelected(new Set());

  const selectedIds = [...selected];
  const hasSelection = selectedIds.length > 0;

  const respond = (status: "attending" | "declined") => {
    bulkSetCeremonyRsvp(selectedIds, status);
    toast.success(
      `${selectedIds.length} invitation${selectedIds.length === 1 ? "" : "s"} ${status === "attending" ? "confirmed" : "declined"}.`,
    );
    setSelected(new Set());
  };

  return (
    <div
      data-testid="bulk-rsvp-controls"
      className="rounded-md border border-gold-muted/50 p-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-cream">Bulk RSVP</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>
            Select All
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {pending.map((inv) => (
          <label
            key={inv.id}
            className="flex items-center gap-2 rounded-md border border-gold-muted/30 p-2 cursor-pointer hover:bg-gold/5"
          >
            <Checkbox checked={selected.has(inv.id)} onCheckedChange={() => toggle(inv.id)} />
            <div className="flex-1 text-sm">
              <span className="text-cream">{inv.ceremonyName}</span>
              <span className="text-cream-muted text-xs ml-2">
                {REGION_AWARD_NAMES[inv.region]} · RSVP by day {getRsvpDeadlineDay(inv)}
              </span>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="gap-1"
          disabled={!hasSelection}
          onClick={() => respond("attending")}
        >
          <Check className="h-3 w-3" />
          Attend Selected
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={!hasSelection}
          onClick={() => respond("declined")}
        >
          <X className="h-3 w-3" />
          Decline Selected
        </Button>
      </div>
    </div>
  );
}
