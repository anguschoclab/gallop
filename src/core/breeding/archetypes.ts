/**
 * archetypes.ts - Re-exports for breeding archetypes
 *
 * This file re-exports types, data, and lookup functions from
 * dedicated modules for backward compatibility.
 */

export { type Archetype } from "./archetypeTypes";

export { ORIGINAL_ARCHETYPES } from "./archetypeOriginal";

export { TRIPLE_CROWN_ARCHETYPES, TRIPLE_CROWN_SERIES_TO_ARCHETYPE } from "./archetypeTripleCrown";

export {
  ALL_ARCHETYPES,
  getArchetypeById,
  getArchetypesBySurface,
  getArchetypeForTripleCrownKey,
  getTripleCrownKeysForArchetype,
} from "./archetypeLookup";
