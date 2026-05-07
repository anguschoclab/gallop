import type { Rng } from "./types";

/**
 * Generate a random UUID v4 using the provided RNG for determinism.
 * Falls back to crypto.randomUUID if no RNG provided.
 */
export function generateUUID(rng?: Rng): string {
  if (!rng) return crypto.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (rng.next() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
