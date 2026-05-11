/**
 * store/slices/awardSlice.ts - Award management slice
 *
 * This file provides award-related state management for regional awards and
 * award ceremonies.
 *
 * Dependencies: @/game/awards/types (RegionalAward), ../types (GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/game/awards/scoring.ts (award scoring logic)
 */

import type { RegionalAward } from "@/game/awards/types";
import type { GameStateCreator } from "../types";

export type AwardSlice = {
  clearPendingCeremonies: () => void;
  setAwards: (awards: RegionalAward[]) => void;
};

export const createAwardSlice: GameStateCreator<AwardSlice> = (set) => ({
  clearPendingCeremonies: () => {
    set({
      pendingAwardCeremonies: undefined,
      currentCeremonyIndex: undefined,
    });
  },

  setAwards: (awards) => {
    set({ awards });
  },
});
