/**
 * awards/InvitationHistoryPanel.tsx - Past ceremony invitation history
 *
 * Lists ceremonies the player was invited to that have already taken place,
 * showing whether they attended and which awards their stable won.
 *
 * Dependencies: @/core/awards/invitations, @/core/awards/types
 * Related files: CeremonyInvitations.tsx, src/components/honors/AwardsTab.tsx
 */

import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Trophy } from "lucide-react";
import { REGION_AWARD_NAMES, CATEGORY_DISPLAY_NAMES } from "@/core/awards/types";
import type { RegionalAward } from "@/core/awards/types";
import {
  didAttend,
  getInvitationOutcome,
  isCeremonyHeld,
  type AwardCeremonyInvitation,
} from "@/core/awards/invitations";
import { CeremonyRsvpBadge } from "./CeremonyRsvpControls";

interface Props {
  invitations: AwardCeremonyInvitation[];
  awards: RegionalAward[];
  day: number;
}

/**
 * Historical record of ceremony invitations and their outcomes.
 * @param props - Invitations, all awards, and the current game day
 */
export function InvitationHistoryPanel({ invitations, awards, day }: Props) {
  const past = invitations
    .filter((i) => isCeremonyHeld(i, day))
    .sort((a, b) => b.ceremonyDay - a.ceremonyDay);

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="text-base text-cream font-[family-name:var(--font-display)] flex items-center gap-2">
          <History className="w-4 h-4 text-gold" />
          Invitation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {past.length === 0 ? (
          <p className="text-sm text-cream-muted">
            No past invitations yet. Ceremonies you are invited to will be recorded here after they
            are held.
          </p>
        ) : (
          past.map((inv) => {
            const won = getInvitationOutcome(awards, inv);
            const attended = didAttend(inv, day);
            return (
              <div key={inv.id} className="rounded-md border border-gold-muted/50 p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to="/ceremony/$invitationId"
                      params={{ invitationId: inv.id }}
                      className="font-semibold text-cream hover:text-gold"
                    >
                      {inv.ceremonyName}
                    </Link>
                    <div className="text-xs text-cream-muted">
                      {REGION_AWARD_NAMES[inv.region]} · Year {inv.year} · Day {inv.ceremonyDay}
                    </div>
                  </div>
                  <CeremonyRsvpBadge invitation={inv} day={day} />
                </div>
                <div className="text-sm text-cream-muted">
                  {inv.qualifiers.length} qualifying Grade 1 placing
                  {inv.qualifiers.length === 1 ? "" : "s"} ·{" "}
                  {attended ? "Attended in person" : "Followed from the stable"}
                </div>
                {won.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {won.map((a) => (
                      <Badge
                        key={a.id}
                        variant="outline"
                        className="border-gold text-gold flex items-center gap-1"
                      >
                        <Trophy className="w-3 h-3" />
                        {CATEGORY_DISPLAY_NAMES[a.category]} — {a.horseName}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-cream-muted/70">No awards won at this ceremony.</div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
