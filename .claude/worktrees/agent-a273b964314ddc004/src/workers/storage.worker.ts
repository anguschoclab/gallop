/**
 * Storage Worker
 * Handles game state persistence in a Web Worker to avoid blocking the main thread
 * during save/load operations. Uses async OPFS API within the worker context.
 */

import { expose } from "comlink";
import type { GameState } from "@/game/types";
import { initOPFS, writeFile, readFile, deleteFile } from "@/services/opfsService";

const GAME_STATE_FILENAME = "gameState.json";

let opfsInitialized = false;

/**
 * Initialize OPFS in the worker context
 */
async function initializeStorage(): Promise<void> {
  if (opfsInitialized) return;

  await initOPFS();
  opfsInitialized = true;
}

/**
 * Load game state from OPFS
 */
async function loadGameState(): Promise<GameState | null> {
  await initializeStorage();

  try {
    return await readFile<GameState>(GAME_STATE_FILENAME);
  } catch (error) {
    console.error("Failed to load game state from OPFS in worker:", error);
    return null;
  }
}

/**
 * Save game state to OPFS
 */
async function saveGameState(state: GameState): Promise<void> {
  await initializeStorage();

  try {
    await writeFile(GAME_STATE_FILENAME, state);
  } catch (error) {
    console.error("Failed to save game state to OPFS in worker:", error);
    throw error;
  }
}

/**
 * Clear game state from OPFS
 */
async function clearGameState(): Promise<void> {
  await initializeStorage();

  try {
    await deleteFile(GAME_STATE_FILENAME);
  } catch (error) {
    console.error("Failed to clear game state from OPFS in worker:", error);
    throw error;
  }
}

/**
 * Storage worker API exposed via Comlink
 */
export type StorageWorkerApi = {
  loadGameState(): Promise<GameState | null>;
  saveGameState(state: GameState): Promise<void>;
  clearGameState(): Promise<void>;
};

// Expose the worker API with Comlink
expose({
  loadGameState,
  saveGameState,
  clearGameState,
} as StorageWorkerApi);
