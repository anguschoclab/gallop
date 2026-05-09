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

/**
 * Systems state selectors for optional subsystems and advanced features
 */
export const useNpcStables = () => useGame((s: GameState) => s.npcStables);
export const useJockeys = () => useGameWithShallow((s: GameState) => s.jockeys ?? []);
export const useAwards = () => useGame((s: GameState) => s.awards);
export const useCampaigns = () => useGameWithShallow((s: GameState) => s.campaigns ?? []);
export const useUserSettings = () => useGame((s: GameState) => s.userSettings);
export const useSireLeaderboards = () => useGame((s: GameState) => s.sireLeaderboards);
export const useIndustryMeanEarnings = () => useGame((s: GameState) => s.industryMeanEarnings ?? 0);

/**
 * Multiple systems state values with shallow comparison
 * Use this when you need multiple systems state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation with shallow comparison
 */

export const useSystemsState = () =>
  useGameWithShallow((s: GameState) => ({
    npcStables: s.npcStables,
    jockeys: s.jockeys ?? [],
    awards: s.awards,
    campaigns: s.campaigns ?? [],
  }));
