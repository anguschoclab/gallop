/**
 * saveManager.ts - Game save slot management
 *
 * This file provides functions for managing manual and automatic save slots,
 * including saving to slots, loading from slots, and metadata management.
 * Save slot state is persisted in IndexedDB; metadata is kept in localStorage.
 */

import { saveSlotState, loadSlotState, deleteSlotState, isIndexedDbAvailable } from "./indexedDbService";
import { saveGameStateToIDB } from "@/game/store/storage";
import type { GameState } from "@/game/types";
import { safeParseJson, gameStateSchema, saveSlotMetadataArraySchema } from "./schemas";

export interface SaveSlotMetadata {
  id: string;
  name: string;
  timestamp: number;
  gameDay: number;
  stableName: string;
  cash: number;
  isAutoSave: boolean;
}

const METADATA_STORAGE_KEY = "gallop_saves_metadata";

/**
 * Retrieves all available save slots and their associated metadata from localStorage.
 *
 * @returns {Promise<SaveSlotMetadata[]>} A promise resolving to an array of save slot metadata.
 */
export async function getSaveSlots(): Promise<SaveSlotMetadata[]> {
  try {
    const stored = localStorage.getItem(METADATA_STORAGE_KEY);
    return stored ? (safeParseJson(stored, saveSlotMetadataArraySchema) ?? []) : [];
  } catch (e) {
    console.error("Failed to load save metadata from localStorage:", e);
    return [];
  }
}

/**
 * Persists the current game state to a specific save slot.
 * Updates both the slot state in IndexedDB and the metadata in localStorage.
 *
 * @param {string} slotId - The unique identifier for the save slot.
 * @param {string} name - The human-readable name for the save.
 * @param {GameState} state - The game state object to persist.
 * @param {boolean} [isAutoSave=false] - Whether this save is an automated checkpoint.
 * @returns {Promise<void>} A promise that resolves when the save operation is complete.
 */
export async function saveToSlot(
  slotId: string,
  name: string,
  state: GameState,
  isAutoSave: boolean = false,
): Promise<void> {
  const storageKey = `gallop_save_${slotId}`;

  // 1. Save the state
  if (isIndexedDbAvailable()) {
    await saveSlotState(slotId, state);
  } else {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
      throw e;
    }
  }

  // 2. Update metadata
  const slots = await getSaveSlots();
  const existingIdx = slots.findIndex((s) => s.id === slotId);

  const newMetadata: SaveSlotMetadata = {
    id: slotId,
    name,
    timestamp: Date.now(),
    gameDay: state.day,
    stableName: state.playerProfile?.stableName || "Unknown Stable",
    cash: state.cash,
    isAutoSave,
  };

  if (existingIdx >= 0) {
    slots[existingIdx] = newMetadata;
  } else {
    slots.push(newMetadata);
  }

  // 3. Save metadata list
  localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(slots));
}

/**
 * Loads a game state from a specific slot, writes it to the main IndexedDB stores,
 * and triggers a full application reload to rehydrate from storage.
 *
 * @param {string} slotId - The unique identifier of the slot to load from.
 * @returns {Promise<void>} A promise that resolves when the state has been successfully swapped.
 */
export async function loadFromSlot(slotId: string): Promise<void> {
  const storageKey = `gallop_save_${slotId}`;

  let state: GameState | null = null;

  // 1. Read from slot
  if (isIndexedDbAvailable()) {
    state = await loadSlotState<GameState>(slotId);
  } else {
    try {
      const stored = localStorage.getItem(storageKey);
      state = stored ? (safeParseJson(stored, gameStateSchema) as GameState | null) : null;
    } catch (e) {
      console.error("Failed to read save from localStorage:", e);
    }
  }

  if (!state) {
    throw new Error(`Save slot ${slotId} not found or empty.`);
  }

  // 2. Write to main IndexedDB stores so the app rehydrates from it on reload
  await saveGameStateToIDB(state);

  // 3. Reload application to rehydrate from the new working state
  window.location.reload();
}

/**
 * Deletes a save slot, its associated state in IndexedDB, and its entry in the metadata list.
 *
 * @param {string} slotId - The unique identifier of the slot to delete.
 * @returns {Promise<void>} A promise that resolves when deletion is complete.
 */
export async function deleteSaveSlot(slotId: string): Promise<void> {
  const storageKey = `gallop_save_${slotId}`;

  // 1. Delete state
  if (isIndexedDbAvailable()) {
    await deleteSlotState(slotId);
  } else {
    localStorage.removeItem(storageKey);
  }

  // 2. Update and save metadata
  const slots = await getSaveSlots();
  const filtered = slots.filter((s) => s.id !== slotId);
  localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(filtered));
}
