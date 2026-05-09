/**
 * legacyFallback.ts - Legacy race name generation fallback
 *
 * This file provides a simple fallback race name generator using
 * traditional prefix-suffix combinations.
 *
 * Dependencies: @/game/rng (Rng)
 * Related files: raceNameGenerator.ts (uses as fallback pattern)
 */

import type { Rng } from "@/game/rng";

const RACE_PREFIXES = [
  "Ascot",
  "Belmont",
  "Churchill",
  "Doncaster",
  "Epsom",
  "Flemington",
  "Goodwood",
  "Hialeah",
  "Irish",
  "Kentucky",
  "Longchamp",
  "Newmarket",
  "Oaklawn",
  "Pimlico",
  "Saratoga",
  "Tokyo",
];

const RACE_SUFFIXES = ["Cup", "Stakes", "Trophy", "Classic", "Handicap", "Plate", "Mile", "Sprint"];

/**
 * Generate a random race name using legacy prefix-suffix pattern.
 *
 * @param rng - Random number generator
 * @returns Random race name
 *
 * @example
 * const name = randomRaceName(rng);
 * // Returns "Belmont Stakes" or similar
 */
export function randomRaceName(rng: Rng): string {
  return `${rng.pick(RACE_PREFIXES)} ${rng.pick(RACE_SUFFIXES)}`;
}
