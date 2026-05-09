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
      breedingPrograms: s.breedingPrograms.map((p) =>
        p.id === program.id ? program : p,
      ),
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
