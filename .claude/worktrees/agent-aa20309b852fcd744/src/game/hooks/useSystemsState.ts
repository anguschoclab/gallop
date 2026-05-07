import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Systems state selectors for optional subsystems and advanced features
 */
export const useNpcStables = () => useGame((s: GameState) => s.npcStables);
export const useJockeys = () => (useGame as any)((s: GameState) => s.jockeys ?? [], shallow);
export const useAwards = () => useGame((s: GameState) => s.awards);
export const useCampaigns = () => (useGame as any)((s: GameState) => s.campaigns ?? [], shallow);
export const useUserSettings = () => useGame((s: GameState) => s.userSettings);
export const useSireLeaderboards = () => useGame((s: GameState) => s.sireLeaderboards);
export const useIndustryMeanEarnings = () => useGame((s: GameState) => s.industryMeanEarnings ?? 0);

/**
 * Multiple systems state values with shallow comparison
 * Use this when you need multiple systems state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation
 */
export const useSystemsState = () =>
  (useGame as any)(
    (s: GameState) => ({
      npcStables: s.npcStables,
      jockeys: s.jockeys ?? [],
      awards: s.awards,
      campaigns: s.campaigns ?? [],
    }),
    shallow,
  );
