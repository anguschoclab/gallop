/**
 * phases/raceInvitations.ts - Race invitation generation phase
 *
 * This file provides the race invitation phase that sends invites for
 * invitation-only races (e.g., Breeders' Cup, invitational stakes).
 * Invites are generated daily for upcoming invite-only races, deduplicated
 * per-horse-per-race via Race.invitedHorseIds, and filtered by distance aptitude.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/game/constants (PHASE_ORDER_RACE_INVITATIONS, DISTANCE_INVITE_THRESHOLD, DEFAULT_INVITE_DAYS_AHEAD, INVITE_AT_LARGE_MULTIPLIER), @/core/race/eligibility (isHorseEligibleForRace), @/core/uuid (generateUUID), @/game/raceSchedule (getCurrentYear)
 * Related files: ../pipeline.ts (uses phase), raceEntryResolution.ts (validates invites)
 */

import {
  PHASE_ORDER_RACE_INVITATIONS,
  DISTANCE_INVITE_THRESHOLD,
  DEFAULT_INVITE_DAYS_AHEAD,
  INVITE_AT_LARGE_MULTIPLIER,
} from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact, InboxImpact } from "@/core/resolver/impacts/index";
import type { Race } from "@/core/race/types";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { generateUUID } from "@/core/uuid";
import { getCurrentYear } from "@/core/race/schedule";

/**
 * Check if a horse has a Win-and-You're-In qualification for a specific race key.
 * @param horse
 * @param horse.winAndYouInQualified
 * @param raceKey
 * @param currentYear
 */
function isWinAndYouInQualified(
  horse: { winAndYouInQualified?: { year: number; raceId: string; raceKey: string }[] },
  raceKey: string,
  currentYear: number,
): boolean {
  if (!horse.winAndYouInQualified) return false;
  return horse.winAndYouInQualified.some((q) => q.raceKey === raceKey && q.year === currentYear);
}

/**
 * Race Invitation Phase (Order 58)
 *
 * Generates invitations for upcoming invitation-only races. Runs daily so that
 * newly-qualified horses (e.g., via Win-and-You're-In prep races) don't miss
 * invites after the initial window. Deduplication via invitedHorseIds ensures
 * each horse receives at most one invite per race.
 */
export const raceInvitationsPhase: PipelinePhase = {
  name: "raceInvitations",
  order: PHASE_ORDER_RACE_INVITATIONS,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];
    const newInbox = [...state.inbox];
    const currentYear = getCurrentYear(newDay);

    // Active pregnancy IDs for eligibility checks
    const pregnantIds = new Set<string>();
    if (state.pregnancies) {
      for (const p of state.pregnancies) {
        if (!p.resolved) pregnantIds.add(p.damId);
      }
    }

    const { horseMap } = context;

    // Find all unresolved invite-only races that are upcoming
    const inviteRaces = Object.values(state.races).filter(
      (r) => !r.resolved && (r.graded?.requiresInvitation || false) && r.day > newDay,
    );

    if (inviteRaces.length === 0) {
      return context;
    }

    const updatedRaces: Record<string, Race> = {};
    for (const race of Object.values(state.races)) {
      // Only process invite-only races that are upcoming
      if (race.resolved || !(race.graded?.requiresInvitation || false) || race.day <= newDay) {
        updatedRaces[race.id] = race;
        continue;
      }

      const inviteDaysAhead = race.graded?.inviteDaysAhead ?? DEFAULT_INVITE_DAYS_AHEAD;
      // Only process if we're within the invite window (today or before)
      if (race.day - newDay > inviteDaysAhead) {
        updatedRaces[race.id] = race;
        continue;
      }

      const raceKey = race.graded?.key;
      const invited = new Set(race.invitedHorseIds ?? []);
      const autoInvites: string[] = [];
      const atLargeCandidates: { horseId: string; fame: number; distanceDiff: number }[] = [];

      for (const horse of Object.values(state.horses)) {
        // Skip if already invited
        if (invited.has(horse.id)) continue;

        // Base eligibility (age, gender, energy, pregnancy, maiden, win conditions)
        if (!isHorseEligibleForRace(horse, race, pregnantIds)) continue;

        // Win-and-you-in qualifiers get automatic invites regardless of distance
        if (raceKey && isWinAndYouInQualified(horse, raceKey, currentYear)) {
          autoInvites.push(horse.id);
          continue;
        }

        // At-large pool: distance filter
        const distanceDiff = Math.abs(race.distance - horse.distanceAptitude);
        if (distanceDiff <= DISTANCE_INVITE_THRESHOLD) {
          atLargeCandidates.push({
            horseId: horse.id,
            fame: horse.fame,
            distanceDiff,
          });
        }
      }

      if (autoInvites.length === 0 && atLargeCandidates.length === 0) {
        updatedRaces[race.id] = race;
        continue;
      }

      // Sort at-large by fame descending, then by distance closeness
      atLargeCandidates.sort((a, b) => {
        if (b.fame !== a.fame) return b.fame - a.fame;
        return a.distanceDiff - b.distanceDiff;
      });

      const maxTotalInvites = Math.max(race.fieldSize, race.fieldSize * INVITE_AT_LARGE_MULTIPLIER);
      const atLargeSlots = Math.max(0, maxTotalInvites - autoInvites.length);
      const selectedAtLarge = atLargeCandidates.slice(0, atLargeSlots);

      const newlyInvited = [...autoInvites, ...selectedAtLarge.map((c) => c.horseId)];

      // Send a single consolidated inbox message for all player-owned newly invited horses
      const ownedInvitedHorses = newlyInvited
        .map((id) => horseMap.get(id))
        .filter((h) => h?.owned) as { id: string; name: string }[];

      if (ownedInvitedHorses.length > 0) {
        const names = ownedInvitedHorses.map((h) => h.name);
        const nameList =
          names.length === 1
            ? names[0]
            : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
        const verb = names.length === 1 ? "has" : "have";

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceInvitations",
          logLevel: "conditional",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "race",
            priority: "action",
            title: `Invitation: ${race.name}`,
            body: `${nameList} ${verb} been invited to compete in ${race.name} (${race.distance}m, ${race.graded?.grade || ""}) on day ${race.day}.`,
            cta: {
              label: "View Race",
              route: "race.$raceId",
              params: { raceId: race.id },
            },
          },
        } as InboxImpact);
      }

      const allInvited = Array.from(new Set([...invited, ...newlyInvited]));

      updatedRaces[race.id] = {
        ...race,
        invitedHorseIds: allInvited,
        graded: race.graded ? { ...race.graded, invitedHorseIds: allInvited } : race.graded,
      };
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
      state: {
        ...state,
        races: updatedRaces,
        inbox: newInbox,
      },
    };
  },
};
