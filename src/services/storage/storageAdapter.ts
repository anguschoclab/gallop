/**
 * Unified Storage Adapter
 * Provides localStorage-based settings persistence (race filters, wizard state, etc.)
 * and exports STORAGE_KEYS for use by other modules.
 */

import { safeParseJson, raceFiltersSchema, wizardStateSchema } from "./schemas";

export const STORAGE_KEYS = {
  GAME_STATE: "gallop_game_state",
  GAME_STATE_FALLBACK: "gallop_game_state_fallback",
  RACE_FILTERS: "gallop_race_filters",
  RACE_HISTORY_LIMIT: "gallop_race_history_limit",
  RACES_DAY_JUMP: "gallop_races_day_jump",
  NEW_GAME_WIZARD: "gallop_new_game_wizard",
} as const;

/**
 * Load race filters from localStorage (always localStorage).
 *
 * @returns Object mapping filter keys to values
 */
export function loadRaceFilters(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RACE_FILTERS);
    if (stored) {
      return safeParseJson(stored, raceFiltersSchema) ?? {};
    }
  } catch (error) {
    console.error("Failed to load race filters from localStorage:", error);
  }
  return {};
}

/**
 * Save race filters to localStorage (always localStorage).
 *
 * @param filters - Object mapping filter keys to values
 * @returns void
 */
export function saveRaceFilters(filters: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACE_FILTERS, JSON.stringify(filters));
  } catch (error) {
    console.error("Failed to save race filters to localStorage:", error);
  }
}

/**
 * Load race history limit from localStorage (always localStorage).
 *
 * @returns Number of race records to keep (10, 20, or 50)
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
 * Save race history limit to localStorage (always localStorage).
 *
 * @param limit - Number of race records to keep
 * @returns void
 */
export function saveRaceHistoryLimit(limit: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACE_HISTORY_LIMIT, limit.toString());
  } catch (error) {
    console.error("Failed to save race history limit to localStorage:", error);
  }
}

/**
 * Load day jump value from localStorage (always localStorage).
 *
 * @returns The stored day jump value or undefined
 */
export function loadDayJump(): string | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RACES_DAY_JUMP);
    if (stored) {
      return stored;
    }
  } catch (error) {
    console.error("Failed to load day jump from localStorage:", error);
  }
  return undefined;
}

/**
 * Save day jump value to localStorage (always localStorage).
 *
 * @param value - The day jump string to save
 * @returns void
 */
export function saveDayJump(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RACES_DAY_JUMP, value);
  } catch (error) {
    console.error("Failed to save day jump to localStorage:", error);
  }
}

/**
 * Clear all settings from localStorage
 * @returns void
 */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RACE_FILTERS);
    localStorage.removeItem(STORAGE_KEYS.RACE_HISTORY_LIMIT);
    localStorage.removeItem(STORAGE_KEYS.RACES_DAY_JUMP);
  } catch (error) {
    console.error("Failed to clear settings from localStorage:", error);
  }
}

// Wizard state type
export interface WizardState {
  step: number;
  stableName: string;
  ownerName: string;
  silk: {
    pattern: string;
    primary: string;
    secondary: string;
    cap: string;
  };
  backstoryId: string;
}

/**
 * Load wizard state from localStorage.
 *
 * @returns WizardState object or null if not found
 */
export function loadWizardState(): WizardState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NEW_GAME_WIZARD);
    if (stored) {
      return safeParseJson(stored, wizardStateSchema) as WizardState | null;
    }
  } catch (error) {
    console.error("Failed to load wizard state from localStorage:", error);
  }
  return null;
}

/**
 * Save wizard state to localStorage.
 *
 * @param state - The wizard state object to persist
 * @returns void
 */
export function saveWizardState(state: WizardState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NEW_GAME_WIZARD, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save wizard state to localStorage:", error);
  }
}

/**
 * Clear wizard state from localStorage
 * @returns void
 */
export function clearWizardState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.NEW_GAME_WIZARD);
  } catch (error) {
    console.error("Failed to clear wizard state from localStorage:", error);
  }
}
