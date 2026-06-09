/**
 * namePools.ts - Regional name pools for race name generation
 *
 * This file provides authentic naming patterns based on real-world racing conventions,
 * including sponsor names, geographic locations, event types, and adjectives for
 * descriptive naming across all regional systems.
 *
 * Dependencies: @/game/types (RegionalSystem), @/game/rng (Rng)
 * Related files: raceNameGenerator.ts (uses these pools for name generation)
 */

// Regional name pools for race generation
// Provides authentic naming patterns based on real-world racing conventions

import type { RegionalSystem } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import namePoolsData from "@/assets/data/namePools.json";

// Sponsor names for race naming
export const SPONSORS: Record<RegionalSystem, string[]> = namePoolsData.SPONSORS as Record<
  RegionalSystem,
  string[]
>;

// Geographic/Location names for race naming
export const LOCATIONS: Record<RegionalSystem, string[]> = namePoolsData.LOCATIONS as Record<
  RegionalSystem,
  string[]
>;

// Event/race type suffixes
export const EVENTS: Record<RegionalSystem, string[]> = namePoolsData.EVENTS as Record<
  RegionalSystem,
  string[]
>;

// Adjectives for descriptive naming
export const ADJECTIVES: Record<RegionalSystem, string[]> = namePoolsData.ADJECTIVES as Record<
  RegionalSystem,
  string[]
>;

/**
 * Get a random element from an array.
 *
 * @param arr - The array to sample from
 * @param rng - Optional random number generator
 * @returns Random element from the array
 *
 * @example
 * const item = randomFromArray(["a", "b", "c"], rng);
 */
export function randomFromArray<T>(arr: T[], rng?: Rng): T {
  const r = rng ? rng.next() : Math.random();
  return arr[Math.floor(r * arr.length)];
}

/**
 * Get a random sponsor name for a region.
 *
 * @param region - The regional system
 * @param rng - Optional random number generator
 * @returns Random sponsor name
 *
 * @example
 * const sponsor = getRandomSponsor("north_america", rng);
 */
export function getRandomSponsor(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(SPONSORS[region] || SPONSORS.north_america, rng);
}

/**
 * Get a random location name for a region.
 *
 * @param region - The regional system
 * @param rng - Optional random number generator
 * @returns Random location name
 *
 * @example
 * const location = getRandomLocation("europe", rng);
 */
export function getRandomLocation(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(LOCATIONS[region] || LOCATIONS.north_america, rng);
}

/**
 * Get a random event name for a region.
 *
 * @param region - The regional system
 * @param rng - Optional random number generator
 * @returns Random event name
 *
 * @example
 * const event = getRandomEvent("asia", rng);
 */
export function getRandomEvent(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(EVENTS[region] || EVENTS.north_america, rng);
}

/**
 * Get a random adjective for a region.
 *
 * @param region - The regional system
 * @param rng - Optional random number generator
 * @returns Random adjective
 *
 * @example
 * const adjective = getRandomAdjective("south_america", rng);
 */
export function getRandomAdjective(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(ADJECTIVES[region] || ADJECTIVES.north_america, rng);
}
