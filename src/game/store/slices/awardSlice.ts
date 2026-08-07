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
import {
  RSVP_LABELS,
  appendInvitationAudit,
  getRsvpDeadlineDay,
  type CeremonyRsvpStatus,
} from "@/core/awards/invitations";
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
      awardCeremonyInvitations: (state.awardCeremonyInvitations ?? []).map((inv) => {
        if (inv.id !== invitationId) return inv;
        const from = inv.rsvp ?? "pending";
        if (from === status) return inv;
        return appendInvitationAudit(
          { ...inv, rsvp: status, respondedDay: state.day },
          {
            day: state.day,
            kind: "rsvp_change",
            from,
            to: status,
            note: `RSVP changed from ${RSVP_LABELS[from]} to ${RSVP_LABELS[status]}${state.day > getRsvpDeadlineDay(inv) ? " (after the deadline)" : ""}.`,
          },
        );
      }),
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
