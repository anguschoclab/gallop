/**
 * uuid.ts - UUID generation
 *
 * This file provides UUID v4 generation with support for deterministic RNG.
 *
 * Dependencies: ./types (Rng)
 * Related files: None
 */

import type { Rng } from "./types";

/**
 * Generate a random UUID v4.
 *
 * Uses the provided RNG for determinism if available, otherwise falls back
 * to crypto.randomUUID for non-deterministic generation.
 *
 * @param rng - Optional random number generator for determinism
 * @returns UUID v4 string
 *
 * @example
 * const id = generateUUID(rng);
 */
export function generateUUID(rng?: Rng): string {
  if (!rng) return crypto.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (rng.next() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
