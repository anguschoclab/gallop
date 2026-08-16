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
import type { Race } from "@/core/race/types";
import { generateUpcomingScheduledRaces, pruneOldRaces } from "@/game/store/helpers/market";
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
    const { state, previousDay, newDay } = context;

    const prevYear = getCurrentYear(previousDay);
    const newYear = getCurrentYear(newDay);
    const isYearTransition = newYear > prevYear;

    let racesArray = Object.values(state.races);

    if (isYearTransition) {
      racesArray = generateAnnualCalendar(newYear, racesArray);
    }

    racesArray = generateUpcomingScheduledRaces(racesArray, newDay);
    const prunedArray = pruneOldRaces(racesArray, newDay);
    const pruned = prunedArray;

    // Emit race deadline notifications for targeted races as inbox impacts
    const impacts: AnyImpact[] = [];
    if (state.campaigns) {
      // ⚡ Bolt Optimization: Pre-calculate hash maps for O(1) lookups instead of running O(N) .find() inside nested loops
      const raceById = new Map<string, Race>();
      const raceByKey = new Map<string, Race>();
      for (const r of prunedArray) {
        if (!raceById.has(r.id)) raceById.set(r.id, r);
        if (r.graded?.key && !raceByKey.has(r.graded.key)) raceByKey.set(r.graded.key, r);
      }

      const horseById = context.horseMap;

      for (const campaign of state.campaigns) {
        for (const slot of campaign.slots) {
          if (slot.status !== "planned") continue;

          let race;
          if (slot.raceId) {
            race = raceById.get(slot.raceId);
          }
          if (!race && slot.raceKey) {
            race = raceByKey.get(slot.raceKey);
          }

          if (race && race.day === newDay + 7) {
            // Deadline is 7 days away
            const horse = horseById.get(campaign.horseId);
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
        races: Object.fromEntries(prunedArray.map((r) => [r.id, r])),
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
