/**
 * phases/breedingSeason.ts - Breeding season reset phase
 *
 * This file provides the breeding season reset phase that zeros out stud.seasonBookings
 * for stallions on the first day of each hemisphere's breeding season.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/calendar/breedingCalendar (isBreedingSeasonStart)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { isBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { PHASE_ORDER_BREEDING_SEASON } from "@/constants";

/**
 * Phase: Breeding Season Reset
 * On the first day of each hemisphere's breeding season, zero out
 * `stud.seasonBookings` for every stallion in that hemisphere so books
 * reopen for new mares.
 */
export const breedingSeasonPhase = {
  name: "breedingSeason",
  order: PHASE_ORDER_BREEDING_SEASON, // After aging (30), before market (50)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const northernStart = isBreedingSeasonStart(newDay, "Northern");
    const southernStart = isBreedingSeasonStart(newDay, "Southern");
    if (!northernStart && !southernStart) return context;

    const horses = state.horses.map((h) => {
      if (!h.stud?.atStud) return h;
      // Skip deceased stallions
      if (h.lifecycleStatus === "deceased") return h;
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
