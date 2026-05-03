/**
 * Isolated localStorage operations
 * Extracted from: races.tsx, stable.$horseId.tsx, store.ts
 */

const STORAGE_KEYS = {
  RACE_FILTERS: "raceFilters",
  RACE_HISTORY_LIMIT: "raceHistoryLimit",
  GAME_STATE: "gallopGameState",
} as const;

/**
 * Load race filters from localStorage
 */
export function loadRaceFilters(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RACE_FILTERS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load race filters from localStorage:", error);
  }
  return {};
}

/**
 * Save race filters to localStorage
 */
export function saveRaceFilters(filters: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACE_FILTERS, JSON.stringify(filters));
  } catch (error) {
    console.error("Failed to save race filters to localStorage:", error);
  }
}

/**
 * Load race history limit from localStorage
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
    console.error("Failed to load race history limit from localStorage:", error);
  }
  return 50;
}

/**
 * Save race history limit to localStorage
 */
export function saveRaceHistoryLimit(limit: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACE_HISTORY_LIMIT, limit.toString());
  } catch (error) {
    console.error("Failed to save race history limit to localStorage:", error);
  }
}

/**
 * Load game state from localStorage
 */
export function loadGameState(): unknown | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load game state from localStorage:", error);
  }
  return null;
}

/**
 * Save game state to localStorage
 */
export function saveGameState(state: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save game state to localStorage:", error);
  }
}

/**
 * Clear all game data from localStorage
 */
export function clearGameData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    localStorage.removeItem(STORAGE_KEYS.RACE_FILTERS);
    localStorage.removeItem(STORAGE_KEYS.RACE_HISTORY_LIMIT);
  } catch (error) {
    console.error("Failed to clear game data from localStorage:", error);
  }
}
