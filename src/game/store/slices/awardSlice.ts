/**
 * store/slices/awardSlice.ts - Award management slice
 *
 * This file provides award-related state management for regional awards and
 * award ceremonies.
 *
 * Dependencies: @/game/awards/types (RegionalAward), ../types (GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/game/awards/scoring.ts (award scoring logic)
 */

import type { RegionalAward } from "@/core/awards/types";
import type { CeremonyRsvpStatus } from "@/core/awards/invitations";
import type { GameStateCreator } from "../types";

export type AwardSlice = {
  clearPendingCeremonies: () => void;
  setAwards: (awards: RegionalAward[]) => void;
  /** Confirm or decline attendance at an award ceremony. */
  setCeremonyRsvp: (invitationId: string, status: CeremonyRsvpStatus) => void;
};

export const createAwardSlice: GameStateCreator<AwardSlice> = (set) => ({
  setCeremonyRsvp: (invitationId, status) => {
    set((state) => ({
      awardCeremonyInvitations: (state.awardCeremonyInvitations ?? []).map((inv) =>
        inv.id === invitationId ? { ...inv, rsvp: status, respondedDay: state.day } : inv,
      ),
    }));
  },

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
