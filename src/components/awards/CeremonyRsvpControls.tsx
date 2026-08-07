/**
 * awards/CeremonyRsvpControls.tsx - RSVP controls for award ceremony invitations
 *
 * Lets the player confirm or decline attendance at a regional award ceremony and
 * shows the current RSVP status. Reused by the awards tab, ceremony detail page,
 * and the inbox.
 *
 * Dependencies: @/game/store, @/core/awards/invitations
 * Related files: CeremonyInvitations.tsx, src/routes/ceremony.$invitationId.tsx, src/routes/inbox.tsx
 */

import { useGame, type StoreType } from "@/game/store";
import type { GameState } from "@/game/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  RSVP_LABELS,
  isCeremonyHeld,
  type AwardCeremonyInvitation,
  type CeremonyRsvpStatus,
} from "@/core/awards/invitations";

const STATUS_CLASSES: Record<CeremonyRsvpStatus, string> = {
  pending: "border-gold-muted text-cream-muted",
  attending: "border-gold text-gold",
  declined: "border-cream-muted/40 text-cream-muted",
};

/** Read-only RSVP status badge. */
export function CeremonyRsvpBadge({
  invitation,
  day,
}: {
  invitation: AwardCeremonyInvitation;
  day: number;
}) {
  const status: CeremonyRsvpStatus = invitation.rsvp ?? "pending";
  const held = isCeremonyHeld(invitation, day);
  const label =
    held && status === "attending"
      ? "Attended"
      : held && status !== "attending"
        ? "Did not attend"
        : RSVP_LABELS[status];
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {label}
    </Badge>
  );
}

/** RSVP buttons plus status badge. Buttons hide once the ceremony has been held. */
export function CeremonyRsvpControls({
  invitation,
  day,
}: {
  invitation: AwardCeremonyInvitation;
  day: number;
}) {
  const setCeremonyRsvp = useGame((s: StoreType) => s.setCeremonyRsvp);
  const status: CeremonyRsvpStatus = invitation.rsvp ?? "pending";
  const held = isCeremonyHeld(invitation, day);

  const respond = (next: CeremonyRsvpStatus) => {
    setCeremonyRsvp(invitation.id, next);
    toast.success(
      next === "attending"
        ? `Attendance confirmed for the ${invitation.ceremonyName}`
        : `Declined the ${invitation.ceremonyName}`,
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CeremonyRsvpBadge invitation={invitation} day={day} />
      {!held && (
        <>
          <Button
            size="sm"
            variant={status === "attending" ? "default" : "outline"}
            className="gap-1"
            onClick={() => respond("attending")}
            disabled={status === "attending"}
          >
            <Check className="h-3 w-3" />
            Attend
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => respond("declined")}
            disabled={status === "declined"}
          >
            <X className="h-3 w-3" />
            Decline
          </Button>
        </>
      )}
    </div>
  );
}

/** Inbox helper: resolves the invitation by ID and renders RSVP controls. */
export function InboxCeremonyRsvp({ invitationId }: { invitationId: string }) {
  const day = useGame((s: GameState) => s.day);
  const invitation = useGame((s: GameState) =>
    (s.awardCeremonyInvitations ?? []).find((i) => i.id === invitationId),
  );
  if (!invitation) return null;
  return (
    <div className="mb-4">
      <CeremonyRsvpControls invitation={invitation} day={day} />
    </div>
  );
}
