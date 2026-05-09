import type { Horse } from "@/game/types";

/**
 * requireHorse — Lookup a horse in the state and return it if found.
 */
export function requireHorse(horses: Horse[], id: string): Horse | undefined {
  return horses.find((h) => h.id === id);
}

/**
 * requireOwned — Ensure the horse exists and is player-owned.
 * Returns null if valid, otherwise returns an ActionResult-style error object.
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
