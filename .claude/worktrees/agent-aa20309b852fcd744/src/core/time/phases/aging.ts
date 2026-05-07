import type { PipelineContext } from "../pipeline";
import type { Horse } from "@/game/types";
import { isUniversalBirthday } from "@/core/calendar/breedingCalendar";

/**
 * Phase: Aging
 * Age horses on hemisphere-specific universal birthdays
 * Northern: Jan 1 (DoY 1), Southern: Aug 1 (DoY 213)
 */
export const agingPhase = {
  name: "aging",
  order: 30,
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
        newAge >= 5
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
