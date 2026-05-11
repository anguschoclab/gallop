/**
 * store/slices/breedingProgramSlice.ts - Breeding program management slice
 *
 * This file provides breeding program management for creating, updating, deleting,
 * and enrolling dams in breeding programs.
 *
 * Dependencies: @/core/breeding/programs (BreedingProgram), ../types (GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/core/breeding/programs.ts (breeding program logic)
 */

import type { BreedingProgram } from "@/core/breeding/programs";
import type { GameStateCreator } from "../types";

export type BreedingProgramSlice = {
  createBreedingProgram: (program: BreedingProgram) => void;
  updateBreedingProgram: (program: BreedingProgram) => void;
  deleteBreedingProgram: (programId: string) => void;
  enrollDamInProgram: (programId: string, damId: string) => void;
};

export const createBreedingProgramSlice: GameStateCreator<BreedingProgramSlice> = (set) => ({
  createBreedingProgram: (program) => {
    set((s) => ({
      breedingPrograms: [...s.breedingPrograms, program],
    }));
  },

  updateBreedingProgram: (program) => {
    set((s) => ({
      breedingPrograms: s.breedingPrograms.map((p) => (p.id === program.id ? program : p)),
    }));
  },

  deleteBreedingProgram: (programId) => {
    set((s) => ({
      breedingPrograms: s.breedingPrograms.filter((p) => p.id !== programId),
    }));
  },

  enrollDamInProgram: (programId, damId) => {
    set((s) => ({
      breedingPrograms: s.breedingPrograms.map((p) =>
        p.id === programId
          ? {
              ...p,
              enrolledDamIds: p.enrolledDamIds.includes(damId)
                ? p.enrolledDamIds
                : [...p.enrolledDamIds, damId],
            }
          : p,
      ),
    }));
  },
});
