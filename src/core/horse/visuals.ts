/**
 * visuals.ts - Silk color generation utilities
 *
 * This file provides utilities for generating random silk colors for horses.
 * Silk colors are used to visually distinguish horses in the UI.
 *
 * Dependencies: @/game/rng (Rng)
 * Related files: horseFactory.ts (uses randomSilk for horse generation)
 */

import type { Rng } from "@/game/rng";

/**
 * Generate random silk color (HSL)
 *
 * Generates a visually distinct HSL color from a predefined hue palette.
 * The colors are designed to be easily distinguishable for UI purposes.
 *
 * @param rng - Random number generator
 * @returns HSL color string in format "hsl(hue, 70%, 50%)"
 *
 * @example
 * const silk = randomSilk(rng);
 * // Returns e.g., "hsl(120, 70%, 50%)"
 */
export function randomSilk(rng: Rng): string {
  const hues = [0, 30, 60, 120, 180, 240, 270, 300, 330];
  const hue = rng.pick(hues);
  return `hsl(${hue}, 70%, 50%)`;
}
