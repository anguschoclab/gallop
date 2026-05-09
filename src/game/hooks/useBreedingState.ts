/**
 * hooks/useBreedingState.ts - Breeding state selectors
 *
 * This file provides Zustand hooks for breeding state including pregnancies and
 * Triple Crown history with shallow comparison for performance.
 *
 * Dependencies: zustand/shallow (shallow), @/game/store (useGame, useGameWithShallow), @/game/types (GameState)
 * Related files: store.ts (state management), breeding.ts (uses breeding state)
 */

import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

const EMPTY_ARRAY: any[] = [];

/**
 * Breeding state selectors for reproduction tracking and lineage.
 *
 * @returns Array of active pregnancies
 */
export const usePregnancies = () => useGame((s: GameState) => s.pregnancies ?? EMPTY_ARRAY);

/**
 * @returns Array of Triple Crown winners
 */
export const useTripleCrownHistory = () => useGameWithShallow((s) => s.triplecrownHistory ?? EMPTY_ARRAY);

/**
 * Multiple breeding state values with shallow comparison.
 * Use this when you need multiple breeding state values in a single hook call.
 * Note: Uses type assertion to work around Zustand typing limitation.
 *
 * @returns Object containing pregnancies and Triple Crown history
 */
export const useBreedingState = () => {
  const pregnancies = useGame((s: GameState) => s.pregnancies);
  const triplecrownHistory = useGame((s: GameState) => s.triplecrownHistory ?? EMPTY_ARRAY);

  return {
    pregnancies,
    triplecrownHistory,
  };
};
