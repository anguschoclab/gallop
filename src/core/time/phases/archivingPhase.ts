/**
 * phases/archivingPhase.ts - Archiving phase
 *
 * This file provides the archiving phase that moves deceased horses and old resolved
 * records out of the active state to keep the simulation performant.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/game/types (Horse, Race, Pregnancy)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_ARCHIVING } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { Horse, Race, Pregnancy } from "@/game/types";

/**
 * Archiving Phase
 * Moves deceased horses and old resolved records out of the active state
 * to keep the simulation performant.
 */
export const archivingPhase: PipelinePhase = {
  name: "archiving",
  order: PHASE_ORDER_ARCHIVING, // Run near the end, before impact application
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // 1. Archive deceased horses
    const activeHorses: Record<string, Horse> = {};
    const archivedHorses: Horse[] = [...(state.archive?.horses || [])];

    for (const horse of Object.values(state.horses)) {
      if (horse.lifecycleStatus === "deceased") {
        archivedHorses.push(horse);
      } else {
        activeHorses[horse.id] = horse;
      }
    }

    // 2. Archive old resolved races (older than 30 days)
    const activeRaces: Record<string, Race> = {};
    const archivedRaces: Race[] = [...(state.archive?.races || [])];
    const RACE_ARCHIVE_DAYS = 30;

    for (const race of Object.values(state.races)) {
      if ((race.resolved || race.cancelled) && newDay - race.day > RACE_ARCHIVE_DAYS) {
        archivedRaces.push(race);
      } else {
        activeRaces[race.id] = race;
      }
    }

    // 3. Archive resolved pregnancies
    const activePregnancies: Pregnancy[] = [];
    const archivedPregnancies: Pregnancy[] = [...(state.archive?.pregnancies || [])];

    if (state.pregnancies) {
      for (const preg of state.pregnancies) {
        if (preg.resolved) {
          archivedPregnancies.push(preg);
        } else {
          activePregnancies.push(preg);
        }
      }
    }

    // 4. Archive old news items (older than 60 days)
    const activeNews = [];
    const archivedNews = [...(state.archive?.news || [])];
    const NEWS_ARCHIVE_DAYS = 60;

    if (state.news) {
      for (const item of state.news) {
        if (newDay - item.day > NEWS_ARCHIVE_DAYS) {
          archivedNews.push(item);
        } else {
          activeNews.push(item);
        }
      }
    }

    return {
      ...context,
      state: {
        ...state,
        horses: activeHorses,
        races: activeRaces,
        pregnancies: activePregnancies,
        news: activeNews,
        archive: {
          horses: archivedHorses,
          races: archivedRaces,
          pregnancies: archivedPregnancies,
          news: archivedNews,
        },
      },
    };
  },
};
