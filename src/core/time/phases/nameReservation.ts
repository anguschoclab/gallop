/**
 * phases/nameReservation.ts - Name reservation cleanup phase
 *
 * This file provides the name reservation phase that cleans up expired name reservations
 * (25 years after horse death) during day advancement.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/game/constants (PHASE_ORDER_NAME_RESERVATION), @/core/horse/naming/reservedNames (cleanupExpiredReservations)
 * Related files: ../pipeline.ts (uses phase), ../phases/index.ts (phase registration)
 */

import { PHASE_ORDER_NAME_RESERVATION } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import { cleanupExpiredReservations } from "@/core/horse/naming/reservedNames";

/**
 * Phase: Name Reservation Cleanup
 * Removes expired name reservations (after 25-year period ends)
 */
export const nameReservationPhase: PipelinePhase = {
  name: "nameReservation",
  order: PHASE_ORDER_NAME_RESERVATION, // After horse death (165)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Cleanup expired reservations
    const cleanedReservations = cleanupExpiredReservations(
      state.reservedHorseNames || [],
      newDay,
    );

    return {
      ...context,
      state: {
        ...state,
        reservedHorseNames: cleanedReservations,
      },
    };
  },
};
