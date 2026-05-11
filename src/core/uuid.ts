/**
 * uuid.ts - Centralized UUID generation utilities
 *
 * This file provides the single source of truth for UUID generation across the codebase.
 * Includes support for deterministic generation using seeded RNG for reproducible gameplay.
 *
 * Dependencies: ./common/types (Rng)
 * Related files: Used throughout the codebase for entity ID generation
 */

import type { Rng } from "./common/types";

/**
 * Generate a proper UUID v4.
 *
 * Uses provided rng for determinism if available, falls back to crypto.randomUUID().
 *
 * @param rng - Optional random number generator for deterministic generation
 * @returns UUID v4 string
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
 * Generate a short unique ID (for internal use only, not for entities).
 *
 * Generates an 8 character alphanumeric string using secure random values.
 *
 * @returns Short ID string
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
 * Check if a string is a valid UUID v4 format.
 *
 * Validates the string against UUID v4 regex pattern.
 *
 * @param str - String to validate
 * @returns True if valid UUID v4 format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Generate a UUID with collision detection against the UUID registry.
 *
 * This function generates a UUID and checks it against the UUID registry to prevent
 * collisions. If a collision is detected, it will regenerate up to 10 times before throwing an error.
 *
 * @param entityType - The type of entity (e.g., 'horse', 'race', 'jockey')
 * @param rng - Optional random number generator for deterministic generation
 * @returns UUID v4 string that is guaranteed to be unique in the registry
 * @throws Error if unable to generate a unique UUID after 10 attempts
 */
export function generateUUIDWithValidation(entityType: string, rng?: Rng): string {
  const { isRegistered, register } = require("./uuidRegistry");

  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const uuid = generateUUID(rng);
    
    if (!isRegistered(uuid)) {
      register(uuid, entityType);
      return uuid;
    }
    
    // Collision detected - regenerate
    // In deterministic mode, this could indicate a serious issue
    if (rng) {
      console.warn(`UUID collision detected for ${entityType} in deterministic mode. This may indicate a problem with the RNG seed.`);
    }
  }

  throw new Error(`Failed to generate unique UUID for ${entityType} after ${maxAttempts} attempts. Registry may be exhausted.`);
}
