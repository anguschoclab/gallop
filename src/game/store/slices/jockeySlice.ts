/**
 * store/slices/jockeySlice.ts - Jockey management slice
 *
 * This file provides jockey-related state and actions for hiring, silk rerolling,
 * and jockey assignment to races.
 *
 * Dependencies: @/game/types (Jockey), @/lib/formatting (formatCurrency), @/game/uuid (generateUUID), ../types (ActionResult, GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/game/jockeyGen.ts (jockey generation)
 */

import type { Jockey } from "@/game/types";
import { formatCurrency } from "@/lib/formatting";
import { generateUUID } from "@/game/uuid";
import type { ActionResult } from "../types";
import type { GameStateCreator } from "../types";
import { requireOwned, requireHorse } from "../guards";

export type JockeySlice = {
  hireJockey: (jockeyId: string, contractType: "standard" | "retainer") => ActionResult;
  hireApprentice: (jockeyId: string) => ActionResult;
  rerollJockeySilk: (jockeyId: string) => ActionResult;
  assignJockey: (raceId: string, horseId: string, jockeyId: string) => ActionResult;
  setJockeys: (jockeys: Jockey[]) => void;
};

export const createJockeySlice: GameStateCreator<JockeySlice> = (set, get) => ({
  hireJockey: (jockeyId: string, contractType: "standard" | "retainer" = "standard") => {
    const s = get();
    const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
    if (!jockey) return { ok: false, reason: "Jockey not found." };
    if (jockey.stableId) return { ok: false, reason: "Jockey is already under contract." };

    const bonusMultiplier = contractType === "retainer" ? 100 : 30;
    const bonus = jockey.ridingFee * bonusMultiplier;
    
    if (s.cash < bonus)
      return {
        ok: false,
        reason: `Insufficient cash. Sign-on bonus is ${formatCurrency(bonus)}.`,
      };

    get().enqueueIntent({
      id: generateUUID(),
      entityId: jockeyId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "jockey_contract",
      jockeyId,
      stableId: "player",
      contractUntil: s.day + (contractType === "retainer" ? 180 : 90),
      bonus,
      stableAffinity: contractType === "retainer" ? 50 : 0, // Retainers start with 50 stable affinity
    } as any);

    return { ok: true };
  },

  hireApprentice: (jockeyId: string) => {
    const s = get();
    const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
    if (!jockey) return { ok: false, reason: "Jockey not found." };
    if (!jockey.isApprentice) return { ok: false, reason: "Jockey is not an apprentice." };
    if (jockey.stableId) return { ok: false, reason: "Jockey is already under contract." };

    // Apprentices are free to enroll but require academy facility (checked in intent validation)
    get().enqueueIntent({
      id: generateUUID(),
      entityId: jockeyId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "jockey_contract",
      jockeyId,
      stableId: "player",
      contractUntil: s.day + 365, // Year-long enrollment
      bonus: 0,
      stableAffinity: 20,
    } as any);

    return { ok: true };
  },

  rerollJockeySilk: (jockeyId: string) => {
    const s = get();
    const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
    if (!jockey) return { ok: false, reason: "Jockey not found." };
    if (!jockey.stableId || (jockey.stableId !== "player" && jockey.stableId !== "player_academy"))
      return { ok: false, reason: "Can only reroll silk for your jockeys." };

    const rerollCost = 100;
    if (s.cash < rerollCost)
      return {
        ok: false,
        reason: `Insufficient cash. Silk reroll costs ${formatCurrency(rerollCost)}.`,
      };

    get().enqueueIntent({
      id: generateUUID(),
      entityId: jockeyId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "reroll_silk",
      jockeyId,
      cost: rerollCost,
    });

    return { ok: true };
  },

  assignJockey: (raceId: string, horseId: string, jockeyId: string) => {
    const s = get();
    const race = s.races.find((r) => r.id === raceId);
    if (!race) return { ok: false, reason: "Race not found." };
    const horse = requireHorse(s.horses, horseId);
    const ownershipGuard = requireOwned(horse);
    if (ownershipGuard) return ownershipGuard;
    const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
    if (!jockey) return { ok: false, reason: "Jockey not found." };

    get().enqueueIntent({
      id: generateUUID(),
      entityId: horseId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "jockey_assignment",
      raceId,
      horseId,
      jockeyId,
    });

    return { ok: true };
  },

  setJockeys: (jockeys) => {
    set({ jockeys });
  },
});
