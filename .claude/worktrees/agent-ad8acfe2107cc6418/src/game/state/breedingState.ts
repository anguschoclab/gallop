// Breeding State - Reproduction and lineage tracking
// Includes pregnancies, stud careers, and breeding history

import type { Pregnancy, TripleCrownProgress } from "../types";

/**
 * Breeding-related state for reproduction tracking and lineage.
 */
export interface BreedingState {
  /** Active pregnancies */
  pregnancies: Pregnancy[];
  /** Historical record of Triple Crown attempts */
  triplecrownHistory?: TripleCrownProgress[];
}

/**
 * Default breeding state for new games
 */
export function createDefaultBreedingState(): BreedingState {
  return {
    pregnancies: [],
  };
}
