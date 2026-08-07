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
  const yearStart = (year - 1) * 365 + 1;
  const yearEnd = year * 365;
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
