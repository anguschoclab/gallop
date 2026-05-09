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

const EMPTY_ARRAY: any[] = [];

/**
 * Core state selectors for essential game loop properties
 */
export const useDay = () => useGame((s: GameState) => s.day);
export const useCash = () => useGame((s: GameState) => s.cash);
export const useHorses = () => useGame((s: GameState) => s.horses);
export const useRaces = () => useGame((s: GameState) => s.races);
export const useLog = () => useGame((s: GameState) => s.log);

export const useExpenses = () => useGameWithShallow((s: GameState) => s.expenses ?? EMPTY_ARRAY);

/**
 * Multiple core state values with shallow comparison
 * Use this when you need multiple core state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation
 */

export const useCoreState = () =>
  useGameWithShallow((s: GameState) => ({ day: s.day, cash: s.cash }));
