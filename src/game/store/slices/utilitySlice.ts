import type { AnyIntent } from "@/core/resolver/intents";
import type { Stable, PlayerProfile } from "@/game/types";
import type { ManagerReputation } from "@/core/reputation";
import type { SystemsState } from "@/game/state/systemsState";
import type { UserSettings } from "@/core/settings/settingsTypes";
import type { GameStateCreator } from "../types";

export type UtilitySlice = {
  enqueueIntent: (intent: AnyIntent) => void;
  setNpcStables: (stables: Stable[]) => void;
  setUserSettings: (settings: UserSettings) => void;
  setExpenses: (expenses: SystemsState["expenses"]) => void;
  setTransactions: (transactions: SystemsState["transactions"]) => void;
  setReplays: (replays: SystemsState["replays"]) => void;
  setReputation: (reputation: ManagerReputation) => void;
  setPlayerProfile: (profile: PlayerProfile) => void;
};

export const createUtilitySlice: GameStateCreator<UtilitySlice> = (set) => ({
  enqueueIntent: (intent) => {
    set((state) => ({
      pendingIntents: [...(state.pendingIntents || []), intent],
    }));
  },

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
});
