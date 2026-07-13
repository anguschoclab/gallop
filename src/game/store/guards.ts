/**
 * store/guards.ts - Store action validation guards
 *
 * This file provides guard functions for validating store actions, including
 * horse lookup and ownership verification.
 *
 * Dependencies: @/game/types (Horse)
 * Related files: Used throughout store slices for validation
 */

import type { Horse } from "@/game/types";

/**
 * Lookup a horse in the state and return it if found.
 *
 * @param horses - Array of horses to search
 * @param id - Horse ID to look up
 * @returns Horse if found, undefined otherwise
 */
export function requireHorse(horses: Record<string, Horse>, id: string): Horse | undefined {
  return horses[id];
}

/**
 * Ensure the horse exists and is player-owned.
 *
 * Returns null if valid, otherwise returns an ActionResult-style error object.
 *
 * @param horse - Horse to check
 * @returns Null if valid, error object otherwise
 */
export function requireOwned(horse: Horse | undefined): { ok: false; reason: string } | null {
  if (!horse) {
    return { ok: false, reason: "Horse not found." };
  }
  if (!horse.owned) {
    return { ok: false, reason: "You don't own this horse." };
  }
  return null;
}
