/**
 * phases/awardInvitations.ts - Award ceremony invitation phase
 *
 * Issues invitations to regional award ceremonies two weeks in advance when the
 * player's stable had a top-3 finish in a Grade 1 race in that region during the
 * award year.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/awards/invitations, @/core/awards/types (AWARD_CEREMONY_SCHEDULE), @/core/calendar/dateFormatting (dayOfYear), @/core/uuid
 * Related files: awards.ts (ceremony phase), src/components/honors/AwardsTab.tsx (UI)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { generateUUID } from "@/core/uuid";
import { AWARD_CEREMONY_SCHEDULE, type AwardRegion } from "@/core/awards/types";
import {
  CEREMONY_INVITE_LEAD_DAYS,
  RSVP_DEADLINE_LEAD_DAYS,
  RSVP_REMINDER_MARKS,
  appendInvitationAudit,
  daysUntilRsvpDeadline,
  findInvitationQualifiers,
  getRsvpDeadlineDay,
  isCeremonyHeld,
  type AwardCeremonyInvitation,
} from "@/core/awards/invitations";
import { PHASE_ORDER_AWARD_INVITATIONS } from "@/constants";
import type { AnyImpact, InboxImpact } from "@/core/resolver/impacts/index";

const REGION_NAMES: Record<AwardRegion, string> = {
  north_america: "North America",
  europe: "Europe",
  asia_pacific: "Asia-Pacific",
  south_america: "South America",
};

export const awardInvitationsPhase: PipelinePhase = {
  name: "awardInvitations",
  order: PHASE_ORDER_AWARD_INVITATIONS,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, raceMap } = context;
    const doy = dayOfYear(newDay);
    const year = Math.floor((newDay - 1) / 365) + 1;
    const existing = state.awardCeremonyInvitations ?? [];
    const impacts: AnyImpact[] = [];
    const logs: { day: number; text: string }[] = [];

    // --- 1. RSVP deadline reminders for outstanding invitations ---
    const updatedExisting = existing.map((inv) => {
      if (isCeremonyHeld(inv, newDay)) return inv;
      const left = daysUntilRsvpDeadline(inv, newDay);
      const status = inv.rsvp ?? "pending";
      const sent = inv.remindersSent ?? [];

      // Deadline just passed without a response.
      if (left === -1 && status === "pending") {
        impacts.push(
          makeInbox(
            newDay,
            `RSVP deadline passed: ${inv.ceremonyName}`,
            `The RSVP window for the ${inv.ceremonyName} (${REGION_NAMES[inv.region]}) has closed without a response. Your stable is recorded as not attending.`,
            inv.id,
            "normal",
          ),
        );
        logs.push({
          day: newDay,
          text: `✉️ RSVP deadline lapsed for the ${inv.ceremonyName}.`,
        });
        return appendInvitationAudit(inv, {
          day: newDay,
          kind: "deadline_lapsed",
          from: "pending",
          note: "RSVP deadline passed with no response recorded.",
        });
      }

      if (status !== "pending") return inv;
      if (!RSVP_REMINDER_MARKS.includes(left) || sent.includes(left)) return inv;

      const when =
        left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} day${left === 1 ? "" : "s"}`;
      impacts.push(
        makeInbox(
          newDay,
          `RSVP reminder: ${inv.ceremonyName}`,
          `Your RSVP for the ${inv.ceremonyName} (${REGION_NAMES[inv.region]}) is due ${when} — day ${getRsvpDeadlineDay(inv)}, ${RSVP_DEADLINE_LEAD_DAYS} days before the ceremony on day ${inv.ceremonyDay}. Confirm or decline your attendance.`,
          inv.id,
          "action",
        ),
      );
      logs.push({
        day: newDay,
        text: `✉️ RSVP for the ${inv.ceremonyName} due ${when}.`,
      });
      return appendInvitationAudit(
        { ...inv, remindersSent: [...sent, left] },
        {
          day: newDay,
          kind: "reminder_sent",
          note:
            left === 0
              ? "Final RSVP reminder sent on the deadline day."
              : `RSVP reminder sent ${left} day${left === 1 ? "" : "s"} before the deadline.`,
        },
      );
    });

    // --- 2. New invitations issued at the lead window ---
    const dueCeremonies = AWARD_CEREMONY_SCHEDULE.filter(
      (c) => c.dayOfYear - CEREMONY_INVITE_LEAD_DAYS === doy,
    );
    const invitations: AwardCeremonyInvitation[] = [];
    const horses = Object.values(state.horses);

    for (const ceremony of dueCeremonies) {
      const alreadyInvited = existing.some(
        (i) => i.region === ceremony.region && i.year === year,
      );
      if (alreadyInvited) continue;

      const qualifiers = findInvitationQualifiers(horses, year, ceremony.region, raceMap);
      if (qualifiers.length === 0) continue;

      const ceremonyDay = (year - 1) * 365 + ceremony.dayOfYear;
      const invitation: AwardCeremonyInvitation = {
        id: generateUUID(),
        region: ceremony.region,
        year,
        ceremonyName: ceremony.name,
        ceremonyDay,
        issuedDay: newDay,
        qualifiers,
        rsvp: "pending",
        remindersSent: [],
        auditLog: [
          {
            day: newDay,
            kind: "invited",
            to: "pending",
            note: `Invitation issued with ${qualifiers.length} qualifying Grade 1 placing${qualifiers.length === 1 ? "" : "s"}. RSVP due day ${ceremonyDay - RSVP_DEADLINE_LEAD_DAYS}.`,
          },
        ],
      };
      invitations.push(invitation);

      const headline = qualifiers[0];
      impacts.push(
        makeInbox(
          newDay,
          `Invitation: ${ceremony.name}`,
          `Your stable is invited to the ${ceremony.name} (${REGION_NAMES[ceremony.region]}) in ${CEREMONY_INVITE_LEAD_DAYS} days. ${headline.horseName} finished ${headline.position === 1 ? "1st" : headline.position === 2 ? "2nd" : "3rd"} in the G1 ${headline.raceName}${qualifiers.length > 1 ? `, one of ${qualifiers.length} qualifying Grade 1 placings` : ""}. RSVP by day ${ceremonyDay - RSVP_DEADLINE_LEAD_DAYS}.`,
          invitation.id,
          "action",
        ),
      );
      logs.push({
        day: newDay,
        text: `✉️ Invited to the ${ceremony.name} (${REGION_NAMES[ceremony.region]}).`,
      });
    }

    if (impacts.length === 0 && invitations.length === 0) return context;

    return {
      ...context,
      state: {
        ...state,
        awardCeremonyInvitations: [...updatedExisting, ...invitations],
      },
      impacts: [...context.impacts, ...impacts],
      logs: [...context.logs, ...logs],
    };
  },
};

/** Build an inbox impact linking to a ceremony detail page. */
function makeInbox(
  day: number,
  title: string,
  body: string,
  invitationId: string,
  priority: "action" | "normal",
): InboxImpact {
  return {
    id: generateUUID(),
    intentId: "",
    day,
    phase: "awardInvitations",
    logLevel: "always",
    type: "inbox_message",
    message: {
      day,
      category: "system",
      priority,
      title,
      body,
      cta: {
        label: "View Ceremony",
        route: "/ceremony/$invitationId",
        params: { invitationId },
      },
    },
  } as InboxImpact;
}

