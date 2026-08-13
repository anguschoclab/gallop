import {
  AUDIT_KIND_LABELS,
  type AwardCeremonyInvitation,
  type InvitationAuditKind,
} from "@/core/awards/invitations";

const ACCENT_KINDS: InvitationAuditKind[] = ["reminder_sent", "rsvp_change"];

export function CeremonyTimeline({ invitation }: { invitation: AwardCeremonyInvitation }) {
  const entries = invitation.auditLog ?? [];
  if (entries.length === 0) {
    return <p className="text-xs text-cream-muted">No activity yet</p>;
  }

  const sorted = [...entries].sort((a, b) => a.day - b.day);

  return (
    <ol className="relative space-y-2 border-l border-gold-muted/30 pl-3">
      {sorted.map((entry, i) => {
        const isAccent = ACCENT_KINDS.includes(entry.kind);
        return (
          <li
            key={`${entry.day}-${entry.kind}-${i}`}
            data-testid="timeline-entry"
            className="relative"
          >
            <span
              data-testid="timeline-dot"
              className={`absolute -left-[15px] top-1 h-2 w-2 rounded-full ${
                isAccent ? "bg-gold" : "bg-cream-muted/50"
              }`}
            />
            <div className="flex items-start gap-2 text-xs">
              <span className="text-cream-muted tabular-nums w-14 shrink-0">Day {entry.day}</span>
              <div className="flex-1">
                <span className={isAccent ? "text-gold font-medium" : "text-cream-muted"}>
                  {AUDIT_KIND_LABELS[entry.kind]}
                </span>
                <span className="text-cream-muted/70 block">{entry.note}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
