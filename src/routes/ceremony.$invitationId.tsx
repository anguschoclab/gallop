import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, CalendarClock, MapPin, Trophy } from "lucide-react";
import { REGION_AWARD_NAMES, CATEGORY_DISPLAY_NAMES } from "@/core/awards/types";
import { formatDate, dayOfYear } from "@/core/calendar/dateFormatting";
import {
  getInvitationOutcome,
  isCeremonyHeld,
  type AwardCeremonyInvitation,
} from "@/core/awards/invitations";
import { CeremonyRsvpControls } from "@/components/awards/CeremonyRsvpControls";
import { InvitationAuditLog } from "@/components/awards/InvitationAuditLog";

export const Route = createFileRoute("/ceremony/$invitationId")({
  head: () => ({
    meta: [
      { title: "Award Ceremony — Stable Honors" },
      {
        name: "description",
        content:
          "Confirm attendance, review invited horses, and see the results of your regional award ceremony.",
      },
      { property: "og:title", content: "Award Ceremony — Stable Honors" },
      {
        property: "og:description",
        content:
          "Confirm attendance, review invited horses, and see the results of your regional award ceremony.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CeremonyPage,
});

const ORDINAL = ["", "1st", "2nd", "3rd"];

function CeremonyPage() {
  const { invitationId } = Route.useParams();
  const day = useGame((s: GameState) => s.day);
  const invitation = useGame((s: GameState) =>
    (s.awardCeremonyInvitations ?? []).find(
      (i: AwardCeremonyInvitation) => i.id === invitationId,
    ),
  );
  const awards = useGame((s: GameState) => s.awards);

  if (!invitation) {
    return (
      <div className="container mx-auto p-6 max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-cream font-[family-name:var(--font-display)]">
          Ceremony not found
        </h1>
        <p className="text-cream-muted">This invitation is no longer available.</p>
        <Link
          to="/honors"
          search={{ tab: "awards" as const }}
          className="text-sm text-gold hover:underline"
        >
          Back to Honors
        </Link>
      </div>
    );
  }

  const held = isCeremonyHeld(invitation, day);
  const daysAway = invitation.ceremonyDay - day;
  const won = getInvitationOutcome(awards, invitation);

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <Link
        to="/honors"
        search={{ tab: "awards" as const }}
        className="inline-flex items-center gap-2 text-sm text-cream-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Awards
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          {invitation.ceremonyName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-cream-muted">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-gold" />
            {REGION_AWARD_NAMES[invitation.region]}
          </span>
          <span className="flex items-center gap-1">
            <CalendarClock className="h-4 w-4 text-gold" />
            {formatDate(dayOfYear(invitation.ceremonyDay))} · Year {invitation.year} (Day{" "}
            {invitation.ceremonyDay})
          </span>
          <Badge variant="outline" className="border-gold-muted text-cream">
            {held ? "Held" : daysAway === 0 ? "Today" : `In ${daysAway} days`}
          </Badge>
        </div>
      </div>

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
            Your Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CeremonyRsvpControls invitation={invitation} day={day} />
          <p className="text-xs text-cream-muted">
            {held
              ? "The ceremony has concluded."
              : "Confirm attendance to represent your stable on the night. Your status also appears in the inbox."}
          </p>
        </CardContent>
      </Card>

      <InvitationAuditLog invitation={invitation} />

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
            Invited Horses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invitation.qualifiers.map((q) => (
            <div
              key={`${q.horseId}-${q.raceId}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold-muted/50 p-3"
            >
              <Link
                to="/stable/$horseId"
                params={{ horseId: q.horseId }}
                className="font-semibold text-cream hover:text-gold"
              >
                {q.horseName}
              </Link>
              <div className="text-sm text-cream-muted">
                {ORDINAL[q.position] ?? `${q.position}th`} in the G1 {q.raceName} · Day {q.day}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="text-base text-cream font-[family-name:var(--font-display)] flex items-center gap-2">
            <Award className="h-4 w-4 text-gold" />
            Ceremony Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!held ? (
            <p className="text-sm text-cream-muted">
              Results will be published after the ceremony takes place.
            </p>
          ) : won.length === 0 ? (
            <p className="text-sm text-cream-muted">
              Your stable did not take home an award at this ceremony.
            </p>
          ) : (
            won.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold/50 p-3"
              >
                <span className="flex items-center gap-2 font-semibold text-cream">
                  <Trophy className="h-4 w-4 text-gold" />
                  {CATEGORY_DISPLAY_NAMES[a.category]}
                </span>
                <Link
                  to="/stable/$horseId"
                  params={{ horseId: a.horseId }}
                  className="text-sm text-gold hover:underline"
                >
                  {a.horseName}
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
