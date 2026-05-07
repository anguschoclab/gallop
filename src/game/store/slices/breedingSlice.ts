/**
 * Breeding Slice
 * Breeding-related state and actions for reproduction and lineage tracking
 */

import type { Pregnancy, TripleCrownProgress } from "@/game/types";
import type { BreedingState } from "@/game/state/breedingState";
import { createDefaultBreedingState } from "@/game/state/breedingState";
import { createBreedingProgram, updateProgramProgress } from "@/core/breeding/programs";
import { getArchetypeById } from "@/core/breeding/archetypes";
import type { BreedingProgram } from "@/core/breeding/programs";
import { canBreed, type BreedResult } from "@/core/breeding/eligibility";
import { generateUUID } from "@/game/uuid";
import type { BreedingIntent } from "@/core/resolver/intents";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE } from "@/game/constants/gameConstants";

export type BreedingSlice = BreedingState & {
  breed: (
    sireId: string,
    damId: string,
    liveFoalGuarantee?: boolean,
  ) => { ok: true } | { ok: false; reason: string };
  retireToPasture: (horseId: string) => { ok: true } | { ok: false; reason: string };
  setPregnancies: (pregnancies: Pregnancy[]) => void;
  setTriplecrownHistory: (history: TripleCrownProgress[]) => void;
  startBreedingProgram: (archetypeId: string) => { ok: true } | { ok: false; reason: string };
  cancelBreedingProgram: () => void;
  enrollDamInProgram: (damId: string) => { ok: true } | { ok: false; reason: string };
  unenrollDamFromProgram: (damId: string) => void;
  recordProgramFoal: (horseId: string) => void;
};

export function createBreedingSlice(
  set: any,
  get: any,
  enqueueIntent: (intent: BreedingIntent) => void,
): BreedingSlice {
  return {
    ...createDefaultBreedingState(),

    breed: (sireId, damId, liveFoalGuarantee = false) => {
      const s = get();
      const sire = s.horses.find((h: any) => h.id === sireId);
      const dam = s.horses.find((h: any) => h.id === damId);
      const fail = (reason: string): { ok: false; reason: string } => {
        set({ log: [{ day: s.day, text: `Breeding: ${reason}` }, ...s.log].slice(0, 50) });
        return { ok: false, reason };
      };

      const eligibility: BreedResult = canBreed(sire, dam, s.day, s.pregnancies);
      if (!eligibility.ok) return fail(eligibility.reason);

      // External-stallion path: if the sire belongs to an NPC stable, charge
      // the player the stud fee (in addition to base breeding fee), credit
      // the stable, and increment the stallion's season-bookings counter.
      const isExternal = !!sire!.stableId;
      let studFee = 0;
      if (isExternal) {
        if (!sire!.stud?.atStud) return fail(`${sire!.name} is not standing at stud.`);
        if (sire!.stud.seasonBookings >= sire!.stud.bookSize) {
          return fail(`${sire!.name}'s book is full this season.`);
        }
        if (sire!.hemisphere !== dam!.hemisphere) {
          return fail("Cross-hemisphere breeding is not supported.");
        }
        studFee = sire!.stud.standingFee;
      }

      const totalFee = isExternal
        ? BREEDING_FEE + (liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
        : 0;
      if (s.cash < totalFee) return fail("Insufficient cash for breeding fee.");

      // Enqueue BreedingIntent for next day advance
      const intent: BreedingIntent = {
        id: generateUUID(),
        entityId: damId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "breeding",
        sireId,
        damId,
        liveFoalGuarantee,
      };

      enqueueIntent(intent);

      // Deduct cash immediately
      set({
        cash: s.cash - totalFee,
        log: [
          {
            day: s.day,
            text: `${sire!.name} × ${dam!.name} breeding scheduled. Fee $${totalFee.toLocaleString()}${studFee ? ` (incl. $${studFee.toLocaleString()} stud fee)` : ""}${liveFoalGuarantee ? " (Live Foal Guarantee)" : ""}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    retireToPasture: (horseId: string) => {
      const s = get();
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (horse.age < 3)
        return { ok: false, reason: "Horse must be at least 3 years old to retire." };

      set({
        horses: s.horses.map((h: any) =>
          h.id === horseId ? { ...h, retired: true, retiredDay: s.day } : h,
        ),
        log: [
          {
            day: s.day,
            text: `${horse.name} retired to pasture.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    setPregnancies: (pregnancies) => {
      set({ pregnancies });
    },

    setTriplecrownHistory: (history) => {
      set({ triplecrownHistory: history });
    },

    startBreedingProgram: (archetypeId) => {
      const archetype = getArchetypeById(archetypeId);
      if (!archetype) return { ok: false, reason: "Unknown archetype." };
      const s = get();
      const program = createBreedingProgram("player", archetypeId, s.day);
      set({ activeBreedingProgram: program });
      return { ok: true };
    },

    cancelBreedingProgram: () => {
      set({ activeBreedingProgram: null });
    },

    enrollDamInProgram: (damId) => {
      const s = get();
      if (!s.activeBreedingProgram) return { ok: false, reason: "No active program." };
      const dam = s.horses.find((h: any) => h.id === damId);
      if (!dam) return { ok: false, reason: "Horse not found." };
      if (dam.gender !== "mare" && dam.gender !== "filly")
        return { ok: false, reason: "Only mares can be enrolled." };
      if (s.activeBreedingProgram.enrolledDamIds.includes(damId))
        return { ok: false, reason: "Already enrolled." };
      set({
        activeBreedingProgram: {
          ...s.activeBreedingProgram,
          enrolledDamIds: [...s.activeBreedingProgram.enrolledDamIds, damId],
        },
      });
      return { ok: true };
    },

    unenrollDamFromProgram: (damId) => {
      const s = get();
      if (!s.activeBreedingProgram) return;
      set({
        activeBreedingProgram: {
          ...s.activeBreedingProgram,
          enrolledDamIds: s.activeBreedingProgram.enrolledDamIds.filter(
            (id: string) => id !== damId,
          ),
        },
      });
    },

    recordProgramFoal: (horseId) => {
      const s = get();
      if (!s.activeBreedingProgram) return;
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return;
      const archetype = getArchetypeById(s.activeBreedingProgram.archetypeId);
      if (!archetype) return;
      const updated = updateProgramProgress(s.activeBreedingProgram, horse, archetype, s.day);
      set({ activeBreedingProgram: updated });
    },
  };
}
