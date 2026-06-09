/**
 * regionalConventions.ts - Regional naming conventions for horses
 *
 * This file provides region-specific name generation using location and sponsor
 * word pools. Each region has its own cultural naming patterns.
 *
 * Dependencies: @/game/rng (Rng), @/game/types (RegionalSystem), @/core/race/naming/namePools (LOCATIONS, SPONSORS)
 * Related files: nameGenerator.ts (uses this for regional strategy), namePools.ts (regional word data)
 */

import type { Rng } from "@/core/common/rng";
import type { RegionalSystem } from "@/game/types";
import { LOCATIONS, SPONSORS } from "@/core/race/naming/namePools";

/**
 * Generate a name based on regional conventions.
 *
 * Uses location and sponsor word pools specific to the region to create
 * culturally appropriate names. Falls back to North America pools if region
 * is not available.
 *
 * @param region - The regional system to use for naming
 * @param rng - Random number generator for variation
 * @returns Regionally-appropriate horse name
 *
 * @example
 * const name = generateRegionalName("europe", rng);
 * // Returns e.g., "Epsom Star" or "Pride of Longchamp"
 */
export function generateRegionalName(region: RegionalSystem, rng: Rng): string {
  const locs = LOCATIONS[region] || LOCATIONS.north_america;
  const sponsors = SPONSORS[region] || SPONSORS.north_america;

  const patterns = [
    (l: string, s: string) => `${l} ${s}`,
    (l: string, s: string) => `${s} of ${l}`,
    (l: string, s: string) => `Pride of ${l}`,
    (l: string, s: string) => `${l} Star`,
  ];

  const l = locs[rng.int(0, locs.length - 1)];
  const s = sponsors[rng.int(0, sponsors.length - 1)];
  const pattern = patterns[rng.int(0, patterns.length - 1)];

  return pattern(l, s).slice(0, 18);
}
