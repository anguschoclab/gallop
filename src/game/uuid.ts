import type { Rng } from "@/game/rng";

/**
 * Generate a proper UUID v4
 * Uses provided rng if available for determinism, falls back to crypto.randomUUID()
 */
export function generateUUID(rng?: Rng): string {
  if (rng) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (rng.next() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Use native crypto.randomUUID if available (better randomness)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    // Fallback to manual UUID v4 generation using secure random values
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const bytes = new Uint8Array(1);
      crypto.getRandomValues(bytes);
      const r = bytes[0] % 16;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  throw new Error("Secure random number generation is not available.");
}

/**
 * Generate a short unique ID (for internal use only, not for entities)
 * 8 character alphanumeric string
 */
export function generateShortId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";

    // We want 8 characters
    while (id.length < 8) {
      const randomValues = new Uint8Array(8);
      crypto.getRandomValues(randomValues);

      for (let i = 0; i < 8 && id.length < 8; i++) {
        // Use rejection sampling to avoid modulo bias.
        // There are 36 characters. The largest multiple of 36 less than 256 is 252.
        // So we only use values < 252.
        if (randomValues[i] < 252) {
          id += chars[randomValues[i] % 36];
        }
      }
    }

    return id;
  }

  throw new Error("Secure random number generation is not available.");
}

/**
 * Check if a string is a valid UUID v4 format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
