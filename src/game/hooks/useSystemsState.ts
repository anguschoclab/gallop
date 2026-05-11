/**
 * hooks/useSystemsState.ts - Systems state selectors
 *
 * This file provides Zustand hooks for systems state including NPC stables, jockeys,
 * awards, campaigns, user settings, sire leaderboards, and industry earnings with
 * shallow comparison.
 *
 * Dependencies: zustand/shallow (shallow), @/game/store (useGame, useGameWithShallow), @/game/types (GameState)
 * Related files: store.ts (state management), used throughout subsystems
 */

import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

const EMPTY_ARRAY: any[] = [];

/**
 * Systems state selectors for optional subsystems and advanced features.
 *
 * @returns Array of NPC stables
 */
export const useNpcStables = () => useGame((s: GameState) => s.npcStables ?? EMPTY_ARRAY);
/**
 * @returns Array of jockeys
 */
export const useJockeys = () => useGameWithShallow((s: GameState) => s.jockeys ?? EMPTY_ARRAY);
/**
 * @returns Array of awards
 */
export const useAwards = () => useGame((s: GameState) => s.awards ?? EMPTY_ARRAY);
/**
 * @returns Array of campaigns
 */
export const useCampaigns = () => useGameWithShallow((s: GameState) => s.campaigns ?? EMPTY_ARRAY);
/**
 * @returns User settings object
 */
export const useUserSettings = () => useGame((s: GameState) => s.userSettings);
/**
 * @returns Sire leaderboards object
 */
export const useSireLeaderboards = () => useGame((s: GameState) => s.sireLeaderboards);
/**
 * @returns Industry mean earnings
 */
export const useIndustryMeanEarnings = () => useGame((s: GameState) => s.industryMeanEarnings ?? 0);

/**
 * Multiple systems state values with shallow comparison.
 * Use this when you need multiple systems state values in a single hook call.
 * Note: Uses type assertion to work around Zustand typing limitation with shallow comparison.
 *
 * @returns Object containing NPC stables, jockeys, awards, and campaigns
 */
export const useSystemsState = () => {
  const npcStables = useGame((s: GameState) => s.npcStables);
  const jockeys = useGame((s: GameState) => s.jockeys ?? EMPTY_ARRAY);
  const awards = useGame((s: GameState) => s.awards);
  const campaigns = useGame((s: GameState) => s.campaigns ?? EMPTY_ARRAY);

  return {
    npcStables,
    jockeys,
    awards,
    campaigns,
  };
};

/**
 * Settings action selectors for user preferences.
 *
 * @returns Object containing functions to update settings and reset them
 */
export const useSettingsActions = () => {
  const updateDisplaySettings = useGame((s) => s.updateDisplaySettings);
  const updateGameplaySettings = useGame((s) => s.updateGameplaySettings);
  const updateNotificationSettings = useGame((s) => s.updateNotificationSettings);
  const updateAudioSettings = useGame((s) => s.updateAudioSettings);
  const resetSettings = useGame((s) => s.resetSettings);

  return {
    updateDisplaySettings,
    updateGameplaySettings,
    updateNotificationSettings,
    updateAudioSettings,
    resetSettings,
  };
};
