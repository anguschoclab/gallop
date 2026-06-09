/**
 * phases/privateSaleExpiry.ts - Private sale expiry phase
 *
 * This file provides the private sale expiry phase that transitions pending/countered
 * offers to 'expired' when their expiry day is reached and prunes expired offers
 * older than 7 game days.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (PrivateSaleOffer)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_PRIVATE_SALE_EXPIRY } from "@/constants/game";
import type { PipelineContext } from "../pipeline";
import type { PrivateSaleOffer } from "@/game/types";

/**
 * Phase: Private Sale Expiry
 * Transition pending/countered offers to 'expired' when their expiry day is reached.
 * Runs before other day-advance effects so the UI always reflects current status.
 * Prunes expired offers older than 7 game days.
 */
export const privateSaleExpiryPhase = {
  name: "privateSaleExpiry",
  order: PHASE_ORDER_PRIVATE_SALE_EXPIRY, // Very early in the pipeline, before most other phases
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs } = context;
    const offers: PrivateSaleOffer[] = state.privateSaleOffers ?? [];
    if (offers.length === 0) return context;

    const newLogs = [...logs];
    const updatedOffers = offers
      .map((o) => {
        // Expire pending/countered offers that have hit their expiry day
        if ((o.status === "pending" || o.status === "countered") && newDay >= o.expiresDay) {
          // Find horse name for the toast/log
          const horse = state.horses.find((h) => h.id === o.horseId);
          const stable = state.npcStables.find((s) => s.id === o.toStableId);
          const horseName = horse?.name ?? "horse";
          const stableName = stable?.name ?? "stable";
          newLogs.push({
            day: newDay,
            text: `Your offer on ${horseName} from ${stableName} expired without a response.`,
          });
          return { ...o, status: "expired" as const };
        }
        return o;
      })
      // Prune expired/declined offers older than 7 days
      .filter((o) => {
        if (o.status === "expired" || o.status === "declined") {
          return newDay - o.createdDay <= 7;
        }
        return true;
      });

    return {
      ...context,
      state: {
        ...state,
        privateSaleOffers: updatedOffers,
      },
      logs: newLogs,
    };
  },
};
