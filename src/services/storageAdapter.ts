/**
 * Unified Storage Adapter
 * Routes game state to OPFS and settings to localStorage
 * Provides fallback to localStorage if OPFS unavailable
 */

import { initOPFS, writeFile, readFile, deleteFile, checkOPFSAvailable } from './opfsService';
import type { GameState } from '@/game/types';

export const STORAGE_KEYS = {
  GAME_STATE: "gallop_game_state",
  GAME_STATE_FALLBACK: "gallop_game_state_fallback",
  RACE_FILTERS: "gallop_race_filters",
  RACE_HISTORY_LIMIT: "gallop_race_history_limit",
  RACES_DAY_JUMP: "gallop_races_day_jump",
} as const;

const GAME_STATE_FILENAME = 'gameState.json';

let opfsInitialized = false;
let useLocalStorageFallback = false;

/**
 * Initialize storage adapter
 */
async function initializeStorage(): Promise<void> {
  if (opfsInitialized) return;
  
  await initOPFS();
  useLocalStorageFallback = !(await checkOPFSAvailable());
  
  if (useLocalStorageFallback) {
    console.warn('OPFS unavailable, falling back to localStorage for game state');
  }
  
  opfsInitialized = true;
}

/**
 * Load game state from OPFS (or localStorage fallback)
 */
export async function loadGameState(): Promise<GameState | null> {
  await initializeStorage();
  
  if (useLocalStorageFallback) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GAME_STATE_FALLBACK);
      if (stored) {
        return JSON.parse(stored) as GameState;
      }
    } catch (error) {
      console.error('Failed to load game state from localStorage fallback:', error);
    }
    return null;
  }
  
  try {
    return await readFile<GameState>(GAME_STATE_FILENAME);
  } catch (error) {
    console.error('Failed to load game state from OPFS:', error);
    return null;
  }
}

/**
 * Save game state to OPFS (or localStorage fallback)
 */
export async function saveGameState(state: GameState): Promise<void> {
  await initializeStorage();
  
  if (useLocalStorageFallback) {
    try {
      localStorage.setItem(STORAGE_KEYS.GAME_STATE_FALLBACK, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save game state to localStorage fallback:', error);
    }
    return;
  }
  
  try {
    await writeFile(GAME_STATE_FILENAME, state);
  } catch (error) {
    console.error('Failed to save game state to OPFS:', error);
    // Fallback to localStorage on write failure
    try {
      localStorage.setItem(STORAGE_KEYS.RACE_FILTERS.replace('Filters', 'State'), JSON.stringify(state));
      console.warn('Fell back to localStorage for game state');
    } catch (fallbackError) {
      console.error('Fallback to localStorage also failed:', fallbackError);
    }
  }
}

/**
 * Clear game state from OPFS (and localStorage fallback)
 */
export async function clearGameState(): Promise<void> {
  await initializeStorage();
  
  // Clear OPFS
  try {
    await deleteFile(GAME_STATE_FILENAME);
  } catch (error) {
    console.error('Failed to clear game state from OPFS:', error);
  }
  
  // Clear localStorage fallback
  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE_FALLBACK);
  } catch (error) {
    console.error('Failed to clear game state from localStorage fallback:', error);
  }
}

/**
 * Load race filters from localStorage (always localStorage)
 */
export function loadRaceFilters(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RACE_FILTERS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load race filters from localStorage:', error);
  }
  return {};
}

/**
 * Save race filters to localStorage (always localStorage)
 */
export function saveRaceFilters(filters: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACE_FILTERS, JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save race filters to localStorage:', error);
  }
}

/**
 * Load race history limit from localStorage (always localStorage)
 */
export function loadRaceHistoryLimit(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RACE_HISTORY_LIMIT);
    if (stored) {
      const limit = parseInt(stored, 10);
      if ([10, 20, 50].includes(limit)) {
        return limit;
      }
    }
  } catch (error) {
    console.error('Failed to load race history limit from localStorage:', error);
  }
  return 50;
}

/**
 * Save race history limit to localStorage (always localStorage)
 */
export function saveRaceHistoryLimit(limit: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACE_HISTORY_LIMIT, limit.toString());
  } catch (error) {
    console.error('Failed to save race history limit to localStorage:', error);
  }
}

/**
 * Load day jump value from localStorage (always localStorage)
 */
export function loadDayJump(): string | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RACES_DAY_JUMP);
    if (stored) {
      return stored;
    }
  } catch (error) {
    console.error('Failed to load day jump from localStorage:', error);
  }
  return undefined;
}

/**
 * Save day jump value to localStorage (always localStorage)
 */
export function saveDayJump(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACES_DAY_JUMP, value);
  } catch (error) {
    console.error('Failed to save day jump to localStorage:', error);
  }
}

/**
 * Clear all settings from localStorage
 */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RACE_FILTERS);
    localStorage.removeItem(STORAGE_KEYS.RACE_HISTORY_LIMIT);
    localStorage.removeItem(STORAGE_KEYS.RACES_DAY_JUMP);
  } catch (error) {
    console.error('Failed to clear settings from localStorage:', error);
  }
}

/**
 * Clear all game data (both OPFS and localStorage)
 */
export async function clearAllGameData(): Promise<void> {
  await clearGameState();
  clearSettings();
}
