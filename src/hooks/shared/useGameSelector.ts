import { useGameWithShallow, useGame } from "@/game/store";
import type { StoreType } from "@/game/store";

/**
 * Type-safe selector hook for accessing game state with shallow comparison.
 * Replaces (useGame as any) casts throughout the codebase.
 * Uses the existing useGameWithShallow from the store.
 * @param selector
 */
export function useGameSelector<T>(selector: (state: StoreType) => T): T {
  return useGameWithShallow(selector);
}

/**
 * Type-safe selector hook for accessing game state without shallow comparison.
 * Use for single-value selectors where reference equality is sufficient.
 * @param selector
 */
export function useGameValue<T>(selector: (state: StoreType) => T): T {
  return useGame(selector);
}
