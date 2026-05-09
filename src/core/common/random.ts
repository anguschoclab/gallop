/**
 * random.ts - Random utility functions
 *
 * This file provides pure numeric random utility functions and re-exports
 * domain-specific random functions from other modules.
 *
 * Dependencies: @/game/rng (Rng), ../horse/visuals (randomSilk), ../race/environment (randomWeather), ../horse/stats (rollRunningStyle)
 * Related files: horse/visuals.ts, race/environment.ts, horse/stats.ts
 */

import type { Rng } from "@/game/rng";

/**
 * Generate random integer in range [min, max] (inclusive).
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param rng - Random number generator
 * @returns Random integer in range
 *
 * @example
 * const value = rand(1, 10, rng);
 */
export function rand(min: number, max: number, rng: Rng): number {
  return rng.int(min, max);
}

// Domain-specific re-exports
export { randomSilk } from "../horse/visuals";
export { randomWeather } from "../race/environment";
export { rollRunningStyle } from "../horse/stats";
