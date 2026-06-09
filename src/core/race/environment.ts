/**
 * environment.ts - Race environment generation
 *
 * This file provides random weather generation for race conditions.
 *
 * Dependencies: @/game/rng (Rng), @/game/types (Weather)
 * Related files: raceSim.ts (uses weather for race simulation)
 */

import type { Rng } from "@/core/common/rng";
import type { Weather } from "@/game/types";

/**
 * Generate random weather condition.
 *
 * Returns a weather type based on weighted random selection:
 * - 45% sunny
 * - 25% cloudy
 * - 15% rainy
 * - 10% sunset
 * - 5% night
 *
 * @param rng - Random number generator
 * @returns Weather type
 *
 * @example
 * const weather = randomWeather(rng);
 */
export function randomWeather(rng: Rng): Weather {
  const r = rng.next();
  if (r < 0.45) return "sunny";
  if (r < 0.7) return "cloudy";
  if (r < 0.85) return "rainy";
  if (r < 0.95) return "sunset";
  return "night";
}
