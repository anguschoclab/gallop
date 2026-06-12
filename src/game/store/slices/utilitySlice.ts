/**
 * store/slices/utilitySlice.ts - Utility state slice
 *
 * This file provides utility state management functions for NPC stables,
 * user settings, expenses, transactions, replays, reputation, and player profile.
 *
 * Dependencies: @/game/types (Stable, PlayerProfile), @/core/reputation (ManagerReputation), @/game/state/systemsState (SystemsState), @/core/settings/settingsTypes (UserSettings), ../types (GameStateCreator)
 * Related files: store/index.ts (uses this slice)
 */

import type { Stable, PlayerProfile, GameState } from "@/game/types";
import type { ManagerReputation } from "@/core/reputation";
import type { SystemsState } from "@/game/store/state/systemsState";
import type { UserSettings } from "@/core/settings/settingsTypes";
import type { GameStateCreator } from "../types";
import { saveToSlot, loadFromSlot } from "@/services/storage/saveManager";

export type UtilitySlice = {
  /** Sets the collection of NPC stables */
  setNpcStables: (stables: Stable[]) => void;
  /** Sets the global user settings */
  setUserSettings: (settings: UserSettings) => void;
  /** Sets the collection of historical expenses */
  setExpenses: (expenses: SystemsState["expenses"]) => void;
  /** Sets the collection of financial transactions */
  setTransactions: (transactions: SystemsState["transactions"]) => void;
  /** Sets the collection of race replays */
  setReplays: (replays: SystemsState["replays"]) => void;
  /** Sets the player's reputation state */
  setReputation: (reputation: ManagerReputation) => void;
  /** Sets the player's profile information */
  setPlayerProfile: (profile: PlayerProfile) => void;
  /** Manual save to a specific slot */
  manualSave: (slotId: string, name: string) => Promise<void>;
  /** Load game from a specific slot */
  loadSlot: (slotId: string) => Promise<void>;
};

export const createUtilitySlice: GameStateCreator<UtilitySlice> = (set, get) => ({
  setNpcStables: (stables) => {
    set({ npcStables: stables });
  },

  setUserSettings: (settings) => {
    set({ userSettings: settings });
  },

  setExpenses: (expenses) => {
    set({ expenses });
  },

  setTransactions: (transactions) => {
    set({ transactions });
  },

  setReplays: (replays) => {
    set({ replays });
  },

  setReputation: (reputation) => {
    set({ reputation });
  },

  setPlayerProfile: (profile) => {
    set({ playerProfile: profile });
  },

  manualSave: async (slotId, name) => {
    const state = get() as unknown as GameState;
    await saveToSlot(slotId, name, state, false);
  },

  loadSlot: async (slotId) => {
    await loadFromSlot(slotId);
  },
});
