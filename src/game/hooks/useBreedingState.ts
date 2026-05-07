import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Breeding state selectors for reproduction tracking and lineage
 */
export const usePregnancies = () => useGame((s: GameState) => s.pregnancies);

export const useTripleCrownHistory = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useGame as any)((s: any) => s.triplecrownHistory ?? [], shallow);

/**
 * Multiple breeding state values with shallow comparison
 * Use this when you need multiple breeding state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation
 */

export const useBreedingState = () =>
  (useGame as any)(
    (s: GameState) => ({
      pregnancies: s.pregnancies,
      triplecrownHistory: s.triplecrownHistory ?? [],
    }),
    shallow,
  );
