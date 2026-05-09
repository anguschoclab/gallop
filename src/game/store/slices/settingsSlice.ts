import type { UserSettings } from "@/core/settings/settingsTypes";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";
import type { GameStateCreator } from "../types";

export type SettingsSlice = {
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  updateDisplaySettings: (settings: Partial<UserSettings["display"]>) => void;
  updateGameplaySettings: (settings: Partial<UserSettings["gameplay"]>) => void;
  updateNotificationSettings: (settings: Partial<UserSettings["notifications"]>) => void;
  updateAudioSettings: (settings: Partial<UserSettings["audio"]>) => void;
  resetSettings: () => void;
  setUserSettings: (settings: UserSettings) => void;
};

export const createSettingsSlice: GameStateCreator<SettingsSlice> = (set, get) => ({
  updateUserSettings: (settings) => {
    set((state) => ({
      userSettings: { ...state.userSettings!, ...settings },
    }));
  },

  updateDisplaySettings: (settings) => {
    set((state) => ({
      userSettings: {
        ...state.userSettings!,
        display: { ...state.userSettings?.display!, ...settings },
      },
    }));
  },

  updateGameplaySettings: (settings) => {
    set((state) => ({
      userSettings: {
        ...state.userSettings!,
        gameplay: { ...state.userSettings?.gameplay!, ...settings },
      },
    }));
  },

  updateNotificationSettings: (settings) => {
    set((state) => ({
      userSettings: {
        ...state.userSettings!,
        notifications: { ...state.userSettings?.notifications!, ...settings },
      },
    }));
  },

  updateAudioSettings: (settings) => {
    set((state) => ({
      userSettings: {
        ...state.userSettings!,
        audio: { ...state.userSettings?.audio!, ...settings },
      },
    }));
  },

  resetSettings: () => {
    set((state) => ({
      userSettings: createDefaultUserSettings(state.day),
    }));
  },

  setUserSettings: (settings) => {
    set({ userSettings: settings });
  },
});
