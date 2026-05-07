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

// Domain-specific re-exports for backward compatibility
export { randomHorseName } from "../horse/naming/legacyFallback";
export { randomSilk } from "../horse/visuals";
export { randomWeather } from "../race/environment";
export { randomRaceName } from "../race/naming/legacyFallback";
export { randomJockeyName } from "../jockey/naming";
export { rollRunningStyle } from "../horse/stats";
