/**
 * store/storage.ts - Zustand persist storage adapter
 *
 * This file provides a custom OPFS-based storage adapter for Zustand persist
 * middleware, including hydration tracking and rehydration functions.
 *
 * Dependencies: @/game/types (GameState), @/services/storageAdapter (loadGameState, saveGameState, clearGameState)
 * Related files: store/index.ts (uses storage adapter), storageAdapter.ts (storage service)
 */

/**
 * Storage Adapter for Zustand Persist
 * Custom OPFS-based storage for game state persistence
 */

import type { GameState } from "@/game/types";
import { loadGameState, saveGameState } from "@/services/storageAdapter";

/**
 * Creates the OPFS storage adapter for Zustand persist.
 *
 * Provides custom storage implementation using OPFS for game state persistence.
 * Handles loading, saving, and removing game state.
 *
 * @returns Zustand persist storage adapter with getItem, setItem, and removeItem methods
 */
export function createOpfsStorage() {
  return {
    getItem: async (_name: string) => {
      const state = await loadGameState();
      if (!state) return null;
      return { state, version: 0 };
    },
    setItem: async (_name: string, value: { state: GameState }) => {
      try {
        await saveGameState(value.state);
      } catch (error) {
        console.error("Failed to save game state to OPFS:", error);
      }
    },
    removeItem: async (_name: string): Promise<void> => {
      await (await import("@/services/storageAdapter")).clearGameState();
    },
  };
}

/**
 * Mutable flag to track if hydration has completed
 * Exported as a getter/setter to allow mutation from store
 */
let _hydrationComplete = false;
export const hydrationComplete = {
  get value() {
    return _hydrationComplete;
  },
  set value(v: boolean) {
    _hydrationComplete = v;
  },
};

/**
 * Creates a rehydrate function that can be called with the store instance.
 *
 * Returns an async function that rehydrates the store from saved state or
 * initializes with default state if no save exists.
 *
 * @param initialState - Function to create initial state if no save exists
 * @returns Async rehydrate function that takes the store instance
 */
export function createRehydrateStore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialState: () => GameState & any,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async function rehydrateStore(useGame: any): Promise<void> {
    const state = await loadGameState();
    if (state) {
      // Use the persist middleware's built-in rehydrate
      // This will call getItem from our custom storage
      await useGame.persist.rehydrate();
      hydrationComplete.value = true;
    } else {
      // No saved state, initialize with default
      useGame.setState(initialState());
      hydrationComplete.value = true;
    }
  };
}
