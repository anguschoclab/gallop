import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Core state selectors for essential game loop properties
 */
export const useDay = () => useGame((s: GameState) => s.day);
export const useCash = () => useGame((s: GameState) => s.cash);
export const useHorses = () => useGame((s: GameState) => s.horses);
export const useRaces = () => useGame((s: GameState) => s.races);
export const useLog = () => useGame((s: GameState) => s.log);
export const useExpenses = () => (useGame as any)((s: GameState) => s.expenses ?? [], shallow);

/**
 * Multiple core state values with shallow comparison
 * Use this when you need multiple core state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation
 */
export const useCoreState = () => (useGame as any)(
  (s: GameState) => ({ day: s.day, cash: s.cash }),
  shallow
);
