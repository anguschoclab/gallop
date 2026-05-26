/**
 * store/slices/horseAdminSlice.ts - Horse administration slice
 *
 * This file provides horse administration actions for stud fee updates, retirement to
 * stud, gelding, renaming, and horse name registration.
 *
 * Dependencies: @/game/uuid (generateUUID), ../guards (requireOwned, requireHorse), ../types (ActionResult, GameStateCreator)
 * Related files: store/index.ts (uses this slice), ../guards.ts (validation guards)
 */

import { generateUUID } from "@/core/uuid";
import { requireOwned, requireHorse } from "../guards";
import type { ActionResult } from "../types";
import type { GameStateCreator } from "../types";

export type HorseAdminSlice = {
  updateStudFee: (horseId: string, newFee: number) => ActionResult;
  retireToStud: (horseId: string) => ActionResult;
  geldingHorse: (horseId: string) => ActionResult;
  renameHorse: (horseId: string, newName: string) => ActionResult;
  registerHorseName: (name: string) => void;
  unregisterHorseName: (name: string) => void;
};

export const createHorseAdminSlice: GameStateCreator<HorseAdminSlice> = (set, get) => ({
  updateStudFee: (horseId, newFee) => {
    const s = get();
    const horse = requireHorse(s.horses, horseId);
    const ownershipGuard = requireOwned(horse);
    if (ownershipGuard) return ownershipGuard;

    if (!horse!.stud) return { ok: false, reason: "Horse is not standing at stud." };

    get().enqueueIntent({
      id: generateUUID(),
      entityId: horseId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "update_stud_fee",
      horseId,
      newFee,
    });

    return { ok: true };
  },

  retireToStud: (horseId) => {
    const s = get();
    const horse = requireHorse(s.horses, horseId);
    const ownershipGuard = requireOwned(horse);
    if (ownershipGuard) return ownershipGuard;
    if (horse!.gender !== "horse" && horse!.gender !== "colt")
      return { ok: false, reason: "Only male horses can stand at stud." };
    if (horse!.age < 4)
      return { ok: false, reason: "Horse must be at least 4 years old to stand at stud." };

    get().enqueueIntent({
      id: generateUUID(),
      entityId: horseId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "stud_retirement",
      horseId,
      standingFee: 500,
      bookSize: 20,
    });

    return { ok: true };
  },

  geldingHorse: (horseId) => {
    const s = get();
    const horse = requireHorse(s.horses, horseId);
    const ownershipGuard = requireOwned(horse);
    if (ownershipGuard) return ownershipGuard;
    if (horse!.gender !== "colt" && horse!.gender !== "horse")
      return { ok: false, reason: "Only colts and stallions can be gelded." };

    get().enqueueIntent({
      id: generateUUID(),
      entityId: horseId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "gelding",
      horseId,
    });

    return { ok: true };
  },

  renameHorse: (horseId, newName) => {
    const s = get();
    const horse = requireHorse(s.horses, horseId);
    const ownershipGuard = requireOwned(horse);
    if (ownershipGuard) return ownershipGuard;

    const lowerNewName = newName.toLowerCase();
    if (s.usedHorseNames.includes(lowerNewName) && lowerNewName !== horse!.name.toLowerCase()) {
      return { ok: false, reason: "Name is already in use." };
    }

    get().enqueueIntent({
      id: generateUUID(),
      entityId: horseId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "rename",
      horseId,
      newName,
    });

    return { ok: true };
  },

  registerHorseName: (name) => {
    const lower = name.toLowerCase();
    set((s) => ({
      usedHorseNames: s.usedHorseNames.includes(lower)
        ? s.usedHorseNames
        : [...s.usedHorseNames, lower],
    }));
  },

  unregisterHorseName: (name) => {
    const lower = name.toLowerCase();
    set((s) => ({
      usedHorseNames: s.usedHorseNames.filter((n) => n !== lower),
    }));
  },
});
