/**
 * awards/InvitationAuditLog.tsx - Audit trail for a ceremony invitation
 *
 * Renders the chronological record of RSVP changes, reminders and status updates
 * captured on a single award ceremony invitation.
 *
 * Dependencies: @/core/awards/invitations
 * Related files: InvitationHistoryPanel.tsx, src/routes/ceremony.$invitationId.tsx
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import {
  AUDIT_KIND_LABELS,
  type AwardCeremonyInvitation,
  type InvitationAuditKind,
} from "@/core/awards/invitations";

const KIND_CLASSES: Record<InvitationAuditKind, string> = {
  invited: "border-gold-muted text-cream-muted",
  rsvp_change: "border-gold text-gold",
  reminder_sent: "border-gold-muted text-cream",
  deadline_lapsed: "border-destructive/60 text-destructive",
  ceremony_held: "border-gold-muted text-cream-muted",
};

/** Compact list of audit entries. */
export function InvitationAuditList({ invitation }: { invitation: AwardCeremonyInvitation }) {
  const entries = invitation.auditLog ?? [];
  if (entries.length === 0) {
    return <p className="text-xs text-cream-muted">No status changes recorded yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {[...entries]
        .sort((a, b) => a.day - b.day)
        .map((entry, i) => (
          <li key={`${entry.day}-${entry.kind}-${i}`} className="flex items-start gap-2 text-xs">
            <span className="text-cream-muted tabular-nums w-16 shrink-0">Day {entry.day}</span>
            <Badge variant="outline" className={`${KIND_CLASSES[entry.kind]} shrink-0`}>
              {AUDIT_KIND_LABELS[entry.kind]}
            </Badge>
            <span className="text-cream-muted">{entry.note}</span>
          </li>
        ))}
    </ol>
  );
}

/** Card wrapper around the audit list for the ceremony detail page. */
export function InvitationAuditLog({ invitation }: { invitation: AwardCeremonyInvitation }) {
  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="text-base text-cream font-[family-name:var(--font-display)] flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-gold" />
          RSVP Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InvitationAuditList invitation={invitation} />
      </CardContent>
    </Card>
  );
}
