"use strict";
/**
 * state/breedingState.ts - Breeding state management
 *
 * This file provides breeding-related state for reproduction tracking and lineage,
 * including pregnancies, Triple Crown history, and active breeding programs.
 *
 * Dependencies: ../types (Pregnancy, TripleCrownProgress), @/core/breeding/programs (BreedingProgram)
 * Related files: store.ts (uses breeding state), breeding.ts (breeding logic)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultBreedingState = createDefaultBreedingState;
/**
 * Create default breeding state for new games.
 *
 * @returns Default breeding state with empty pregnancies and no active breeding program
 */
function createDefaultBreedingState() {
    return {
        pregnancies: [],
        triplecrownHistory: [],
        activeBreedingProgram: null,
        syndicates: {},
    };
}
