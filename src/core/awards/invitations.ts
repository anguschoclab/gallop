/**
 * awards/invitations.ts - Award ceremony invitations
 *
 * Determines whether the player's stable has earned an invitation to a regional
 * award ceremony. A stable is invited when one of its horses finished in the
 * top 3 of a Group/Grade 1 race held in that region during the award year.
 *
 * Dependencies: @/core/horse/types (Horse), @/core/race/types (Race), ./types (AwardRegion), @/data/gradedRaces (getTrackContinent)
 * Related files: src/core/time/phases/awardInvitations.ts (phase), src/components/honors/AwardsTab.tsx (UI)
 */

import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import type { AwardRegion } from "./types";
import { getTrackContinent, type Continent } from "@/data/gradedRaces";
import { DAYS_PER_YEAR } from "@/constants";

const CONTINENT_TO_REGION: Record<Continent, AwardRegion> = {
  north_america: "north_america",
  europe: "europe",
  asia_pacific: "asia_pacific",
  south_america: "south_america",
};

/** Days before a ceremony that invitations are issued. */
export const CEREMONY_INVITE_LEAD_DAYS = 14;

/** A single qualifying performance that earned the invitation. */
export interface InvitationQualifier {
  horseId: string;
  horseName: string;
  raceId: string;
  raceName: string;
  /** Finishing position (1-3). */
  position: number;
  day: number;
}

/** RSVP status for a ceremony invitation. */
export type CeremonyRsvpStatus = "pending" | "attending" | "declined";

/** Days before the ceremony that an RSVP must be submitted. */
export const RSVP_DEADLINE_LEAD_DAYS = 3;

/** Days-until-deadline marks on which a reminder is sent. */
export const RSVP_REMINDER_MARKS = [5, 2, 0];

/** Kinds of auditable events on an invitation. */
export type InvitationAuditKind =
  "invited" | "rsvp_change" | "reminder_sent" | "deadline_lapsed" | "ceremony_held";

/** A single audit entry recording an invitation status change. */
export interface InvitationAuditEntry {
  day: number;
  kind: InvitationAuditKind;
  /** Previous RSVP status, when the entry describes a change. */
  from?: CeremonyRsvpStatus;
  /** New RSVP status, when the entry describes a change. */
  to?: CeremonyRsvpStatus;
  /** Human-readable description. */
  note: string;
}

/** An invitation to a regional award ceremony. */
export interface AwardCeremonyInvitation {
  id: string;
  region: AwardRegion;
  /** Award year the ceremony celebrates. */
  year: number;
  /** Display name of the ceremony. */
  ceremonyName: string;
  /** Absolute game day the ceremony takes place. */
  ceremonyDay: number;
  /** Absolute game day the invitation was issued. */
  issuedDay: number;
  /** Performances that earned the invitation. */
  qualifiers: InvitationQualifier[];
  /** Player's RSVP status (defaults to pending). */
  rsvp?: CeremonyRsvpStatus;
  /** Absolute game day the player responded. */
  respondedDay?: number;
  /** Days-until-deadline marks already reminded about. */
  remindersSent?: number[];
  /** Chronological audit trail of RSVP and status changes. */
  auditLog?: InvitationAuditEntry[];
}

/** Human-readable RSVP labels. */
export const RSVP_LABELS: Record<CeremonyRsvpStatus, string> = {
  pending: "Awaiting RSVP",
  attending: "Attending",
  declined: "Declined",
};

/** Human-readable audit event labels. */
export const AUDIT_KIND_LABELS: Record<InvitationAuditKind, string> = {
  invited: "Invitation issued",
  rsvp_change: "RSVP updated",
  reminder_sent: "Reminder sent",
  deadline_lapsed: "Deadline lapsed",
  ceremony_held: "Ceremony held",
};

/**
 * Whether the ceremony has already taken place.
 *
 * @param invitation - The ceremony invitation
 * @param day - Current game day
 * @returns True if the ceremony day has passed
 */
export function isCeremonyHeld(invitation: AwardCeremonyInvitation, day: number): boolean {
  return day >= invitation.ceremonyDay;
}

/**
 * Absolute game day by which an RSVP must be submitted.
 *
 * @param invitation - The ceremony invitation
 * @returns The deadline day
 */
export function getRsvpDeadlineDay(invitation: AwardCeremonyInvitation): number {
  return invitation.ceremonyDay - RSVP_DEADLINE_LEAD_DAYS;
}

/**
 * Days left to respond (negative once the deadline has passed).
 *
 * @param invitation - The ceremony invitation
 * @param day - Current game day
 * @returns Days remaining until RSVP deadline
 */
export function daysUntilRsvpDeadline(invitation: AwardCeremonyInvitation, day: number): number {
  return getRsvpDeadlineDay(invitation) - day;
}

/**
 * Whether the RSVP window has closed.
 *
 * @param invitation - The ceremony invitation
 * @param day - Current game day
 * @returns True if the RSVP deadline has passed
 */
export function isRsvpDeadlinePassed(invitation: AwardCeremonyInvitation, day: number): boolean {
  return day > getRsvpDeadlineDay(invitation);
}

/**
 * Append an audit entry, returning a new invitation.
 *
 * @param invitation - The ceremony invitation
 * @param entry - The audit entry to append
 * @returns A new invitation with the audit entry appended
 */
export function appendInvitationAudit(
  invitation: AwardCeremonyInvitation,
  entry: InvitationAuditEntry,
): AwardCeremonyInvitation {
  return { ...invitation, auditLog: [...(invitation.auditLog ?? []), entry] };
}

/**
 * Whether the player attended (RSVP'd attending and the ceremony was held).
 *
 * @param invitation - The ceremony invitation
 * @param day - Current game day
 * @returns True if the player attended the ceremony
 */
export function didAttend(invitation: AwardCeremonyInvitation, day: number): boolean {
  return isCeremonyHeld(invitation, day) && invitation.rsvp === "attending";
}

/**
 * Awards the player won at the ceremony this invitation refers to.
 *
 * @param awards - All awards in the game
 * @param invitation - The invitation to resolve outcomes for
 * @returns Player-owned awards for that region and year
 */
export function getInvitationOutcome<
  T extends { region: AwardRegion; year: number; stableId?: string },
>(awards: T[], invitation: AwardCeremonyInvitation): T[] {
  return awards.filter(
    (a) => !a.stableId && a.region === invitation.region && a.year === invitation.year,
  );
}

/**
 * Collect the player's top-3 Grade 1 finishes for a region within an award year.
 *
 * @param horses - All horses in the game
 * @param year - Award year (1-indexed)
 * @param region - Award region
 * @param raceMap - Map of race ID to Race for O(1) lookups
 * @returns Qualifying performances, newest first
 */
export function findInvitationQualifiers(
  horses: Horse[],
  year: number,
  region: AwardRegion,
  raceMap: Map<string, Race>,
): InvitationQualifier[] {
  const yearStart = (year - 1) * DAYS_PER_YEAR + 1;
  const yearEnd = year * DAYS_PER_YEAR;
  const qualifiers: InvitationQualifier[] = [];

  for (const horse of horses) {
    // Player-owned horses only (NPC-owned horses carry a stableId)
    if (!horse.owned || horse.stableId) continue;

    for (const entry of horse.raceHistory) {
      if (entry.day < yearStart || entry.day > yearEnd) continue;
      if (entry.position > 3) continue;

      const race = raceMap.get(entry.raceId);
      const grade = entry.grade ?? race?.graded?.grade;
      if (grade !== "G1") continue;

      const track = race?.graded?.track;
      if (!track) continue;
      if (CONTINENT_TO_REGION[getTrackContinent(track)] !== region) continue;

      qualifiers.push({
        horseId: horse.id,
        horseName: horse.name,
        raceId: entry.raceId,
        raceName: entry.raceName,
        position: entry.position,
        day: entry.day,
      });
    }
  }

  return qualifiers.sort((a, b) => b.day - a.day);
}
