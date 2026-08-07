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
  findInvitationQualifiers,
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

    const dueCeremonies = AWARD_CEREMONY_SCHEDULE.filter(
      (c) => c.dayOfYear - CEREMONY_INVITE_LEAD_DAYS === doy,
    );
    if (dueCeremonies.length === 0) return context;

    const existing = state.awardCeremonyInvitations ?? [];
    const invitations: AwardCeremonyInvitation[] = [];
    const impacts: AnyImpact[] = [];
    const horses = Object.values(state.horses);

    for (const ceremony of dueCeremonies) {
      const alreadyInvited = existing.some(
        (i) => i.region === ceremony.region && i.year === year,
      );
      if (alreadyInvited) continue;

      const qualifiers = findInvitationQualifiers(horses, year, ceremony.region, raceMap);
      if (qualifiers.length === 0) continue;

      const ceremonyDay = (year - 1) * 365 + ceremony.dayOfYear;
      invitations.push({
        id: generateUUID(),
        region: ceremony.region,
        year,
        ceremonyName: ceremony.name,
        ceremonyDay,
        issuedDay: newDay,
        qualifiers,
        rsvp: "pending",
      });

      const headline = qualifiers[0];
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "awardInvitations",
        logLevel: "always",
        type: "inbox_message",
        message: {
          day: newDay,
          category: "system",
          priority: "action",
          title: `Invitation: ${ceremony.name}`,
          body: `Your stable is invited to the ${ceremony.name} (${REGION_NAMES[ceremony.region]}) in ${CEREMONY_INVITE_LEAD_DAYS} days. ${headline.horseName} finished ${headline.position === 1 ? "1st" : headline.position === 2 ? "2nd" : "3rd"} in the G1 ${headline.raceName}${qualifiers.length > 1 ? `, one of ${qualifiers.length} qualifying Grade 1 placings` : ""}.`,
          cta: {
            label: "View Ceremony",
            route: "/ceremony/$invitationId",
            params: { invitationId: invitations[invitations.length - 1].id },
          },
        },
      } as InboxImpact);
    }

    if (invitations.length === 0) return context;

    return {
      ...context,
      state: {
        ...state,
        awardCeremonyInvitations: [...existing, ...invitations],
      },
      impacts: [...context.impacts, ...impacts],
      logs: [
        ...context.logs,
        ...invitations.map((i: AwardCeremonyInvitation) => ({
          day: newDay,
          text: `✉️ Invited to the ${i.ceremonyName} (${REGION_NAMES[i.region]}).`,
        })),
      ],
    };
  },
};
