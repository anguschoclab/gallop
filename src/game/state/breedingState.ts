/**
 * state/breedingState.ts - Breeding state management
 *
 * This file provides breeding-related state for reproduction tracking and lineage,
 * including pregnancies, Triple Crown history, and active breeding programs.
 *
 * Dependencies: ../types (Pregnancy, TripleCrownProgress), @/core/breeding/programs (BreedingProgram)
 * Related files: store.ts (uses breeding state), breeding.ts (breeding logic)
 */

// Breeding State - Reproduction and lineage tracking
// Includes pregnancies, stud careers, and breeding history

import type { Pregnancy, TripleCrownProgress } from "../types";
import type { BreedingProgram } from "@/core/breeding/programs";
import type { Syndicate } from "@/core/breeding/types";

/**
 * Breeding-related state for reproduction tracking and lineage.
 */
export interface BreedingState {
  /** Active pregnancies */
  pregnancies: Pregnancy[];
  /** Historical record of Triple Crown attempts */
  triplecrownHistory?: TripleCrownProgress[];
  /** Player's active multi-generation breeding program (one at a time) */
  activeBreedingProgram: BreedingProgram | null;
  /** Stallion syndicates indexed by stallion ID */
  syndicates: Record<string, Syndicate>;
}

/**
 * Create default breeding state for new games.
 *
 * @returns Default breeding state with empty pregnancies and no active breeding program
 */
export function createDefaultBreedingState(): BreedingState {
  return {
    pregnancies: [],
    triplecrownHistory: [],
    activeBreedingProgram: null,
    syndicates: {},
  };
}
