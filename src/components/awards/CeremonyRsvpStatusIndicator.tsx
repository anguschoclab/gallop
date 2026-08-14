import { TOOLTIP_DELAY_MS } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  isCeremonyHeld,
  isRsvpDeadlinePassed,
  type AwardCeremonyInvitation,
} from "@/core/awards/invitations";

type Phase = "pending" | "locked" | "counted";

const PHASE_LABELS: Record<Phase, string> = {
  pending: "Awaiting RSVP",
  locked: "RSVP Locked",
  counted: "Counted",
};

const PHASE_CLASSES: Record<Phase, string> = {
  pending: "border-gold-muted text-gold-muted",
  locked: "border-destructive/60 text-destructive",
  counted: "border-green-600 text-green-500",
};

const PHASE_TOOLTIPS: Record<Phase, string> = {
  pending: "RSVP window open — you can still confirm or decline attendance.",
  locked: "RSVP deadline has passed — your response can no longer be changed.",
  counted: "Ceremony held — your RSVP has been counted toward eligibility.",
};

function getPhase(invitation: AwardCeremonyInvitation, day: number): Phase {
  if (isCeremonyHeld(invitation, day)) return "counted";
  if (isRsvpDeadlinePassed(invitation, day)) return "locked";
  return "pending";
}

export function CeremonyRsvpStatusIndicator({
  invitation,
  day,
}: {
  invitation: AwardCeremonyInvitation;
  day: number;
}) {
  const phase = getPhase(invitation, day);
  const label =
    phase === "counted" && invitation.rsvp !== "attending" ? "Not Counted" : PHASE_LABELS[phase];

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={PHASE_CLASSES[phase]} data-testid="rsvp-status">
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{PHASE_TOOLTIPS[phase]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
