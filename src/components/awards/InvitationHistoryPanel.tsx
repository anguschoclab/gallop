/**
 * awards/InvitationHistoryPanel.tsx - Past ceremony invitation history
 *
 * Lists ceremonies the player was invited to that have already taken place,
 * showing whether they attended and which awards their stable won. Supports
 * filtering by region, attendance status and outcome, and exposes each
 * invitation's RSVP audit trail.
 *
 * Dependencies: @/core/awards/invitations, @/core/awards/types
 * Related files: CeremonyInvitations.tsx, InvitationAuditLog.tsx, src/components/honors/AwardsTab.tsx
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, Trophy, ScrollText } from "lucide-react";
import {
  REGION_AWARD_NAMES,
  CATEGORY_DISPLAY_NAMES,
  type AwardRegion,
} from "@/core/awards/types";
import type { RegionalAward } from "@/core/awards/types";
import {
  didAttend,
  getInvitationOutcome,
  isCeremonyHeld,
  type AwardCeremonyInvitation,
} from "@/core/awards/invitations";
import { CeremonyRsvpBadge } from "./CeremonyRsvpControls";
import { InvitationAuditList } from "./InvitationAuditLog";

interface Props {
  invitations: AwardCeremonyInvitation[];
  awards: RegionalAward[];
  day: number;
}

type AttendanceFilter = "all" | "attended" | "missed" | "no_response";
type OutcomeFilter = "all" | "won" | "none";

const REGIONS: AwardRegion[] = ["north_america", "europe", "asia_pacific", "south_america"];

const ATTENDANCE_LABELS: Record<AttendanceFilter, string> = {
  all: "Any attendance",
  attended: "Attended",
  missed: "Declined",
  no_response: "No response",
};

const OUTCOME_LABELS: Record<OutcomeFilter, string> = {
  all: "Any outcome",
  won: "Won awards",
  none: "No awards",
};

/**
 * Historical record of ceremony invitations and their outcomes.
 * @param props - Invitations, all awards, and the current game day
 */
export function InvitationHistoryPanel({ invitations, awards, day }: Props) {
  const [region, setRegion] = useState<AwardRegion | "all">("all");
  const [attendance, setAttendance] = useState<AttendanceFilter>("all");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [openAudit, setOpenAudit] = useState<string | null>(null);

  const past = useMemo(
    () =>
      invitations
        .filter((i) => isCeremonyHeld(i, day))
        .sort((a, b) => b.ceremonyDay - a.ceremonyDay),
    [invitations, day],
  );

  const filtered = useMemo(
    () =>
      past.filter((inv) => {
        if (region !== "all" && inv.region !== region) return false;
        const status = inv.rsvp ?? "pending";
        if (attendance === "attended" && status !== "attending") return false;
        if (attendance === "missed" && status !== "declined") return false;
        if (attendance === "no_response" && status !== "pending") return false;
        const won = getInvitationOutcome(awards, inv).length > 0;
        if (outcome === "won" && !won) return false;
        if (outcome === "none" && won) return false;
        return true;
      }),
    [past, region, attendance, outcome, awards],
  );

  const hasFilters = region !== "all" || attendance !== "all" || outcome !== "all";

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
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={region}
                onValueChange={(v) => setRegion(v as AwardRegion | "all")}
              >
                <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Filter by region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REGION_AWARD_NAMES[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={attendance}
                onValueChange={(v) => setAttendance(v as AttendanceFilter)}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Filter by attendance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ATTENDANCE_LABELS) as AttendanceFilter[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ATTENDANCE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={outcome} onValueChange={(v) => setOutcome(v as OutcomeFilter)}>
                <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Filter by outcome">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OUTCOME_LABELS) as OutcomeFilter[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {OUTCOME_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    setRegion("all");
                    setAttendance("all");
                    setOutcome("all");
                  }}
                >
                  Clear
                </Button>
              )}
              <span className="text-xs text-cream-muted ml-auto">
                {filtered.length} of {past.length}
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-cream-muted">No invitations match these filters.</p>
            ) : (
              filtered.map((inv) => {
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
                          {REGION_AWARD_NAMES[inv.region]} · Year {inv.year} · Day{" "}
                          {inv.ceremonyDay}
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
                      <div className="text-xs text-cream-muted/70">
                        No awards won at this ceremony.
                      </div>
                    )}
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setOpenAudit(openAudit === inv.id ? null : inv.id)}
                      >
                        <ScrollText className="w-3 h-3" />
                        {openAudit === inv.id ? "Hide" : "Show"} RSVP audit log
                      </Button>
                      {openAudit === inv.id && (
                        <div className="mt-2 border-t border-gold-muted/40 pt-2">
                          <InvitationAuditList invitation={inv} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
