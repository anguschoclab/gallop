import type { PipelineContext } from "../pipeline";
import { generateUpcomingRaces, pruneOldRaces } from "@/game/store/helpers/market";
import { generateAnnualCalendar, getCurrentYear } from "@/game/raceSchedule";

/**
 * Phase: Race Generation and Pruning
 * On year transition: pre-populates all graded stakes for the new year via generateAnnualCalendar.
 * Every day: generates upcoming track races (7 days ahead) and prunes old non-graded races.
 */
export const racesPhase = {
  name: "races",
  order: 60,
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

    return {
      ...context,
      state: {
        ...state,
        races: pruned,
      },
    };
  },
};
