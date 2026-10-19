import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CeremonyRsvpControls } from "@/domains/awards/ui/CeremonyRsvpControls";
import { CeremonyRsvpStatusIndicator } from "@/domains/awards/ui/CeremonyRsvpStatusIndicator";
import { BulkRsvpControls } from "@/domains/awards/ui/BulkRsvpControls";
import { Badge } from "@/shared/ui/badge";
import { MailOpen, CalendarClock } from "lucide-react";
import { REGION_AWARD_NAMES } from "@/domains/awards/application/awardsFacade";
import type { AwardCeremonyInvitation } from "@/domains/awards/application/awardsFacade";

const ORDINAL = ["", "1st", "2nd", "3rd"];

interface Props {
  invitations: AwardCeremonyInvitation[];
  day: number;
}

/**
 * Lists ceremony invitations earned through top-3 Grade 1 finishes.
 * @param props - Invitations and the current game day
 */
export function CeremonyInvitations({ invitations, day }: Props) {
  if (invitations.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground font-[family-name:var(--font-display)] flex items-center gap-2">
            <MailOpen className="w-4 h-4 text-primary" />
            Ceremony Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No invitations yet. Finish in the top 3 of a Grade 1 race to be invited to that
            region&apos;s award ceremony.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...invitations]
    .filter((i) => i.ceremonyDay > day)
    .sort((a, b) => a.ceremonyDay - b.ceremonyDay);

  if (sorted.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground font-[family-name:var(--font-display)] flex items-center gap-2">
            <MailOpen className="w-4 h-4 text-primary" />
            Ceremony Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No upcoming invitations. Past invites are listed in the invitation history below.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base text-foreground font-[family-name:var(--font-display)] flex items-center gap-2">
          <MailOpen className="w-4 h-4 text-primary" />
          Ceremony Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <BulkRsvpControls />
        {sorted.map((inv) => {
          const daysAway = inv.ceremonyDay - day;
          return (
            <div key={inv.id} className="rounded-md border border-border/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to="/ceremony/$invitationId"
                    params={{ invitationId: inv.id }}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {inv.ceremonyName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {REGION_AWARD_NAMES[inv.region]} · Year {inv.year}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CeremonyRsvpStatusIndicator invitation={inv} day={day} />
                  <Badge
                    variant="outline"
                    className="border-border text-foreground flex items-center gap-1 whitespace-nowrap"
                  >
                    <CalendarClock className="w-3 h-3" />
                    {daysAway > 0 ? `In ${daysAway} days` : "Held"}
                  </Badge>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {inv.qualifiers.slice(0, 4).map((q) => (
                  <li key={`${q.horseId}-${q.raceId}`}>
                    • {q.horseName} — {ORDINAL[q.position] ?? `${q.position}th`} in the G1{" "}
                    {q.raceName}
                  </li>
                ))}
                {inv.qualifiers.length > 4 && (
                  <li className="text-muted-foreground/70">
                    + {inv.qualifiers.length - 4} more qualifying placings
                  </li>
                )}
              </ul>
              <CeremonyRsvpControls invitation={inv} day={day} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
