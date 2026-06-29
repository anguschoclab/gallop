/**
 * phases/races.ts - Race generation and pruning phase
 *
 * This file provides the race generation and pruning phase that pre-populates
 * graded stakes on year transition and generates upcoming track races daily.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/store/helpers/market (generateUpcomingRaces, pruneOldRaces), @/game/raceSchedule (generateAnnualCalendar, getCurrentYear)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_RACES } from "@/constants";
import type { PipelineContext } from "../pipeline";
import { generateUpcomingRaces, pruneOldRaces } from "@/game/store/helpers/market";
import { generateAnnualCalendar, getCurrentYear } from "@/core/race/schedule";
import { generateUUID } from "@/core/uuid";
import type { AnyImpact, InboxImpact } from "@/core/resolver/impacts/index";

/**
 * Phase: Race Generation and Pruning
 * On year transition: pre-populates all graded stakes for the new year via generateAnnualCalendar.
 * Every day: generates upcoming track races (7 days ahead) and prunes old non-graded races.
 */
export const racesPhase = {
  name: "races",
  order: PHASE_ORDER_RACES,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, previousDay, newDay, dailyRng } = context;

    const prevYear = getCurrentYear(previousDay);
    const newYear = getCurrentYear(newDay);
    const isYearTransition = newYear > prevYear;

    let races = state.races;

    if (isYearTransition) {
      races = generateAnnualCalendar(newYear, races);
    }

    races = generateUpcomingRaces(races, newDay, dailyRng);
    const pruned = pruneOldRaces(races, newDay);

    // Emit race deadline notifications for targeted races as inbox impacts
    const impacts: AnyImpact[] = [];
    if (state.campaigns) {
      for (const campaign of state.campaigns) {
        for (const slot of campaign.slots) {
          if (slot.status !== "planned") continue;

          const race = pruned.find(
            (r) =>
              (slot.raceKey && r.graded?.key === slot.raceKey) ||
              (slot.raceId && r.id === slot.raceId),
          );

          if (race && race.day === newDay + 7) {
            // Deadline is 7 days away
            const horse = state.horses.find((h) => h.id === campaign.horseId);
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day: newDay,
              phase: "races",
              logLevel: "conditional",
              type: "inbox_message",
              message: {
                day: newDay,
                category: "deadline",
                priority: "action",
                title: `Race Deadline: ${race.name}`,
                body: `The entry deadline for ${race.name} is in 7 days. ${
                  horse?.name || "Your horse"
                } is targeted for this race.`,
                cta: {
                  label: "View Race",
                  route: "race.$raceId",
                  params: { raceId: race.id },
                },
              },
            } as InboxImpact);
          }
        }
      }
    }

    return {
      ...context,
      state: {
        ...state,
        races: pruned,
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
