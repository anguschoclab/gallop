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
