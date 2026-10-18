/**
 * random.ts - Random utility functions
 *
 * This file provides pure numeric random utility functions.
 * Domain-specific random functions live with their domain
 * (e.g. randomSilk in horse/visuals, randomWeather in race/environment,
 * rollRunningStyle in horse/stats).
 *
 * Dependencies: @/shared/common/rng (Rng)
 */

import type { Rng } from "@/shared/common/rng";

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
