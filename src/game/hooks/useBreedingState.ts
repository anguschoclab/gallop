import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Breeding state selectors for reproduction tracking and lineage
 */
export const usePregnancies = () => useGame((s: GameState) => s.pregnancies);

export const useTripleCrownHistory = () => useGameWithShallow((s) => s.triplecrownHistory ?? []);

/**
 * Multiple breeding state values with shallow comparison
 * Use this when you need multiple breeding state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation
 */

export const useBreedingState = () =>
  useGameWithShallow((s: GameState) => ({
    pregnancies: s.pregnancies,
    triplecrownHistory: s.triplecrownHistory ?? [],
  }));
