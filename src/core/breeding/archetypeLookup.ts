/**
 * archetypeLookup.ts - Archetype lookup functions
 *
 * Extracted from archetypes.ts for modularity.
 */

import type { Archetype } from "./archetypeTypes";
import { ORIGINAL_ARCHETYPES } from "./archetypeOriginal";
import { TRIPLE_CROWN_ARCHETYPES, TRIPLE_CROWN_SERIES_TO_ARCHETYPE } from "./archetypeTripleCrown";

export const ALL_ARCHETYPES: Archetype[] = [...ORIGINAL_ARCHETYPES, ...TRIPLE_CROWN_ARCHETYPES];

/**
 * Get archetype by ID.
 *
 * @param id - The archetype ID to search for
 * @returns The archetype with matching ID, or undefined
 */
export function getArchetypeById(id: string): Archetype | undefined {
  return ALL_ARCHETYPES.find((a) => a.id === id);
}

/**
 * Get archetypes by surface preference.
 *
 * @param surface - The surface type to filter by
 * @returns Array of archetypes that prefer the given surface
 */
export function getArchetypesBySurface(
  surface: "Turf" | "Dirt" | "Synthetic" | "Versatile",
): Archetype[] {
  return ALL_ARCHETYPES.filter((a) => a.targetPhenotype.surface === surface);
}

/**
 * Get archetype for a specific triple crown series.
 *
 * @param tcKey - The triple crown series key
 * @returns The archetype ID for the series, or undefined if not found
 */
export function getArchetypeForTripleCrownKey(tcKey: string): string | undefined {
  return TRIPLE_CROWN_SERIES_TO_ARCHETYPE[tcKey];
}

/**
 * Get all triple crown series keys for a specific archetype.
 *
 * @param archetypeId - The archetype ID
 * @returns Array of triple crown series keys that map to this archetype
 */
export function getTripleCrownKeysForArchetype(archetypeId: string): string[] {
  return Object.entries(TRIPLE_CROWN_SERIES_TO_ARCHETYPE)
    .filter(([_, archetype]) => archetype === archetypeId)
    .map(([tcKey, _]) => tcKey);
}
