/**
 * Pure numeric random utility functions
 */

import type { Rng } from "@/game/rng";

/**
 * Generate random integer in range [min, max] (inclusive)
 */
export function rand(min: number, max: number, rng: Rng): number {
  return rng.int(min, max);
}

// Domain-specific re-exports
export { randomSilk } from "../horse/visuals";
export { randomWeather } from "../race/environment";
export { rollRunningStyle } from "../horse/stats";
