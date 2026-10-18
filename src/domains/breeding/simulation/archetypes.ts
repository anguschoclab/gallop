/**
 * archetypes.ts - Re-exports for breeding archetypes
 *
 * This file re-exports types, data, and lookup functions from
 * dedicated modules for backward compatibility.
 */

export { type Archetype } from "@/domains/breeding/model/archetypeTypes";

export { ORIGINAL_ARCHETYPES } from "@/domains/breeding/simulation/archetypeOriginal";

export {
  TRIPLE_CROWN_ARCHETYPES,
  TRIPLE_CROWN_SERIES_TO_ARCHETYPE,
} from "@/domains/breeding/simulation/archetypeTripleCrown";

export {
  ALL_ARCHETYPES,
  getArchetypeById,
  getArchetypesBySurface,
  getArchetypeForTripleCrownKey,
  getTripleCrownKeysForArchetype,
} from "@/domains/breeding/simulation/archetypeLookup";
