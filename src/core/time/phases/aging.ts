/**
 * phases/aging.ts - Aging phase
 *
 * This file provides the aging phase that ages horses on hemisphere-specific
 * universal birthdays (Northern: Jan 1, Southern: Aug 1).
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (Horse), @/core/calendar/breedingCalendar (isUniversalBirthday)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import type { Horse } from "@/game/types";
import { isUniversalBirthday } from "@/core/calendar/breedingCalendar";
import { PHASE_ORDER_AGING } from "@/constants";

/**
 * Phase: Aging
 * Age horses on hemisphere-specific universal birthdays
 * Northern: Jan 1 (DoY 1), Southern: Aug 1 (DoY 213)
 */
export const agingPhase = {
  name: "aging",
  order: PHASE_ORDER_AGING,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const northernTick = isUniversalBirthday(newDay, "Northern");
    const southernTick = isUniversalBirthday(newDay, "Southern");

    if (!northernTick && !southernTick) {
      return context;
    }

    const horses = state.horses.map((h) => {
      const ticks =
        (h.hemisphere === "Northern" && northernTick) ||
        (h.hemisphere === "Southern" && southernTick);
      if (!ticks) return h;
      const newAge = h.age + 1;
      const newGender =
        newAge >= 3
          ? h.gender === "colt"
            ? "horse"
            : h.gender === "filly"
              ? "mare"
              : h.gender
          : h.gender;
      return { ...h, age: newAge, gender: newGender };
    });

    return {
      ...context,
      state: {
        ...state,
        horses,
      },
    };
  },
};
