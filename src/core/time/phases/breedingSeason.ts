import type { PipelineContext } from "../pipeline";
import { isBreedingSeasonStart } from "@/core/calendar/breedingCalendar";

/**
 * Phase: Breeding Season Reset
 * On the first day of each hemisphere's breeding season, zero out
 * `stud.seasonBookings` for every stallion in that hemisphere so books
 * reopen for new mares.
 */
export const breedingSeasonPhase = {
  name: "breedingSeason",
  order: 35, // After aging (30), before market (50)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const northernStart = isBreedingSeasonStart(newDay, "Northern");
    const southernStart = isBreedingSeasonStart(newDay, "Southern");
    if (!northernStart && !southernStart) return context;

    const horses = state.horses.map((h) => {
      if (!h.stud?.atStud) return h;
      const reset =
        (h.hemisphere === "Northern" && northernStart) ||
        (h.hemisphere === "Southern" && southernStart);
      if (!reset) return h;
      return { ...h, stud: { ...h.stud, seasonBookings: 0 } };
    });

    return {
      ...context,
      state: { ...state, horses },
    };
  },
};
