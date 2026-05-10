/**
 * saveManager.ts - Game save slot management
 *
 * This file provides functions for managing manual and automatic save slots,
 * including saving to slots, loading from slots, and metadata management.
 */

import { writeFile, readFile, deleteFile, checkOPFSAvailable } from "./opfsService";
import { STORAGE_KEYS } from "./storageAdapter";
import type { GameState } from "@/game/types";

export interface SaveSlotMetadata {
  id: string;
  name: string;
  timestamp: number;
  gameDay: number;
  stableName: string;
  cash: number;
  isAutoSave: boolean;
}

const METADATA_FILENAME = "savesMetadata.json";
const METADATA_STORAGE_KEY = "gallop_saves_metadata";

/**
 * Get all available save slots and their metadata.
 */
export async function getSaveSlots(): Promise<SaveSlotMetadata[]> {
  const opfsAvailable = await checkOPFSAvailable();

  if (!opfsAvailable) {
    try {
      const stored = localStorage.getItem(METADATA_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load save metadata from localStorage:", e);
      return [];
    }
  }

  try {
    const metadata = await readFile<SaveSlotMetadata[]>(METADATA_FILENAME);
    return metadata || [];
  } catch (e) {
    console.error("Failed to load save metadata from OPFS:", e);
    return [];
  }
}

/**
 * Save the provided state to a specific slot.
 */
export async function saveToSlot(
  slotId: string,
  name: string,
  state: GameState,
  isAutoSave: boolean = false,
): Promise<void> {
  const opfsAvailable = await checkOPFSAvailable();
  const filename = `save_${slotId}.json`;
  const storageKey = `gallop_save_${slotId}`;

  // 1. Save the state file
  if (!opfsAvailable) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
      throw e;
    }
  } else {
    try {
      await writeFile(filename, state);
    } catch (e) {
      console.error("Failed to save state to OPFS:", e);
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
  if (!opfsAvailable) {
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(slots));
  } else {
    await writeFile(METADATA_FILENAME, slots);
  }
}

/**
 * Load state from a specific slot and overwrite the working state.
 */
export async function loadFromSlot(slotId: string): Promise<void> {
  const opfsAvailable = await checkOPFSAvailable();
  const filename = `save_${slotId}.json`;
  const storageKey = `gallop_save_${slotId}`;
  const workingStateFilename = "gameState.json"; // Matches gameConstants or storageAdapter usage

  let state: GameState | null = null;

  // 1. Read from slot
  if (!opfsAvailable) {
    try {
      const stored = localStorage.getItem(storageKey);
      state = stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to read save from localStorage:", e);
    }
  } else {
    state = await readFile<GameState>(filename);
  }

  if (!state) {
    throw new Error(`Save slot ${slotId} not found or empty.`);
  }

  // 2. Overwrite working state
  if (!opfsAvailable) {
    localStorage.setItem(STORAGE_KEYS.GAME_STATE_FALLBACK, JSON.stringify(state));
  } else {
    await writeFile(workingStateFilename, state);
  }

  // 3. Reload application to rehydrate from the new working state
  window.location.reload();
}

/**
 * Delete a save slot and its metadata.
 */
export async function deleteSaveSlot(slotId: string): Promise<void> {
  const opfsAvailable = await checkOPFSAvailable();
  const filename = `save_${slotId}.json`;
  const storageKey = `gallop_save_${slotId}`;

  // 1. Delete state file
  if (!opfsAvailable) {
    localStorage.removeItem(storageKey);
  } else {
    await deleteFile(filename);
  }

  // 2. Update and save metadata
  const slots = await getSaveSlots();
  const filtered = slots.filter((s) => s.id !== slotId);

  if (!opfsAvailable) {
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(filtered));
  } else {
    await writeFile(METADATA_FILENAME, filtered);
  }
}
