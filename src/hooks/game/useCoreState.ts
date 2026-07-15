/**
 * hooks/useCoreState.ts - Core state selectors
 *
 * This file provides Zustand hooks for core game state including day, cash, horses,
 * races, log, and expenses with shallow comparison for performance.
 *
 * Dependencies: zustand/shallow (shallow), @/game/store (useGame, useGameWithShallow), @/game/types (GameState)
 * Related files: store.ts (state management), used throughout components
 */

import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

const EMPTY_ARRAY: never[] = [];

/**
 * Core state selectors for essential game loop properties.
 *
 * @returns Current game day
 */
export const useDay = () => useGame((s: GameState) => s.day);

/**
 * @returns Current player cash
 */
export const useCash = () => useGame((s: GameState) => s.cash);

/**
 * @returns Array of all horses
 */
export const useHorses = () => useGame((s: GameState) => s.horses);

/**
 * @returns Array of all races
 */
export const useRaces = () => useGame((s: GameState) => s.races);

/**
 * @returns Array of game logs
 */
export const useLog = () => useGame((s: GameState) => s.log);

/**
 * @returns Array of stable expenses
 */
export const useExpenses = () => useGameWithShallow((s: GameState) => s.expenses ?? EMPTY_ARRAY);

/**
 * @returns Array of financial transactions
 */
export const useTransactions = () =>
  useGameWithShallow((s: GameState) => s.transactions ?? EMPTY_ARRAY);

/**
 * Multiple core state values with shallow comparison.
 * Use this when you need multiple core state values in a single hook call.
 * Note: Uses type assertion to work around Zustand typing limitation.
 *
 * @returns Object containing current day and cash
 */
export const useCoreState = () => {
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);

  return { day, cash };
};
