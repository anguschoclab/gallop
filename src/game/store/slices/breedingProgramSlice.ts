/**
 * store/slices/breedingProgramSlice.ts - Breeding program management slice
 *
 * Manages the player's single active multi-generation breeding program plus the
 * historical breedingPrograms list. Exposes the actions consumed by
 * BreedingProgramPanel: startBreedingProgram, cancelBreedingProgram,
 * enrollDamInProgram, unenrollDamFromProgram, plus low-level CRUD helpers.
 */

import {
  createBreedingProgram as buildBreedingProgram,
  type BreedingProgram,
} from "@/core/breeding/programs";
import { getArchetypeById } from "@/core/breeding/archetypes";
import type { ActionResult, GameStateCreator } from "../types";
import {
  PLAYER_STABLE_ID,
  PROGRAM_STATUS_CANCELLED,
  CANCEL_REASON_USER,
  ERR_NO_ACTIVE_PROGRAM,
  ERR_PROGRAM_ALREADY_ACTIVE,
  ERR_MARE_ALREADY_ENROLLED,
  FALLBACK_STABLE_NAME,
} from "@/constants/breedingConstants";

export type BreedingProgramSlice = {
  /** Begin a new active breeding program targeting the given archetype. */
  startBreedingProgram: (archetypeId: string) => ActionResult;
  /** Cancel the active breeding program and record cancellation metadata. */
  cancelBreedingProgram: (opts?: { reason?: string }) => ActionResult;
  /** Enroll a dam into the active program. */
  enrollDamInProgram: (damId: string) => ActionResult;
  /** Remove a dam from the active program. */
  unenrollDamFromProgram: (damId: string) => void;

  // ─── Low-level CRUD on the historical breedingPrograms list ────────────────
  createBreedingProgram: (program: BreedingProgram) => void;
  updateBreedingProgram: (program: BreedingProgram) => void;
  deleteBreedingProgram: (programId: string) => void;
};

export const createBreedingProgramSlice: GameStateCreator<BreedingProgramSlice> = (set, get) => ({
  startBreedingProgram: (archetypeId) => {
    const state = get();
    if (state.activeBreedingProgram) {
      return { ok: false, reason: ERR_PROGRAM_ALREADY_ACTIVE };
    }
    const stableId = PLAYER_STABLE_ID;
    const day = state.day;
    const program = buildBreedingProgram(stableId, archetypeId, day);
    set((s) => ({
      activeBreedingProgram: program,
      breedingPrograms: [...s.breedingPrograms, program],
    }));
    return { ok: true };
  },

  cancelBreedingProgram: (opts) => {
    const state = get();
    const program = state.activeBreedingProgram;
    if (!program) {
      return { ok: false, reason: ERR_NO_ACTIVE_PROGRAM };
    }

    const cancelledProgram: BreedingProgram = {
      ...program,
      enrolledDamIds: [],
      status: PROGRAM_STATUS_CANCELLED,
      cancelledAtDay: state.day,
      cancellationReason: opts?.reason ?? CANCEL_REASON_USER,
    };

    const stableName = state.playerProfile?.stableName ?? FALLBACK_STABLE_NAME;
    const archetypeName = getArchetypeById(program.archetypeId)?.name ?? program.archetypeId;
    state.addLogEntry({
      day: state.day,
      text: `${stableName} cancelled the ${archetypeName} breeding program on day ${state.day}.`,
    });

    set((s) => ({
      activeBreedingProgram: null,
      breedingPrograms: s.breedingPrograms.map((p: BreedingProgram) =>
        p.id === cancelledProgram.id ? cancelledProgram : p,
      ),
    }));

    return { ok: true };
  },

  enrollDamInProgram: (damId) => {
    const state = get();
    const program = state.activeBreedingProgram;
    if (!program) return { ok: false, reason: ERR_NO_ACTIVE_PROGRAM };
    if (program.enrolledDamIds.includes(damId)) {
      return { ok: false, reason: ERR_MARE_ALREADY_ENROLLED };
    }
    const updated: BreedingProgram = {
      ...program,
      enrolledDamIds: [...program.enrolledDamIds, damId],
    };
    set((s) => ({
      activeBreedingProgram: updated,
      breedingPrograms: s.breedingPrograms.map((p: BreedingProgram) =>
        p.id === updated.id ? updated : p,
      ),
    }));
    return { ok: true };
  },

  unenrollDamFromProgram: (damId) => {
    set((s) => {
      const program: BreedingProgram | null = s.activeBreedingProgram;
      if (!program) return {};
      const updated: BreedingProgram = {
        ...program,
        enrolledDamIds: program.enrolledDamIds.filter((id: string) => id !== damId),
      };
      return {
        activeBreedingProgram: updated,
        breedingPrograms: s.breedingPrograms.map((p: BreedingProgram) =>
          p.id === updated.id ? updated : p,
        ),
      };
    });
  },

  createBreedingProgram: (program) => {
    set((s) => ({
      breedingPrograms: [...s.breedingPrograms, program],
    }));
  },

  updateBreedingProgram: (program) => {
    set((s) => ({
      breedingPrograms: s.breedingPrograms.map((p: BreedingProgram) =>
        p.id === program.id ? program : p,
      ),
      activeBreedingProgram:
        s.activeBreedingProgram?.id === program.id ? program : s.activeBreedingProgram,
    }));
  },

  deleteBreedingProgram: (programId) => {
    set((s) => ({
      breedingPrograms: s.breedingPrograms.filter((p: BreedingProgram) => p.id !== programId),
      activeBreedingProgram:
        s.activeBreedingProgram?.id === programId ? null : s.activeBreedingProgram,
    }));
  },
});
