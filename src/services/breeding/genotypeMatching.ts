/**
 * genotypeMatching.ts - Re-export from @/core/breeding/genotypeMatching
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing service importers working during the transition.
 *
 * @deprecated Import from @/core/breeding/genotypeMatching instead.
 */

export { calculateGeneticCompatibility } from "@/core/breeding/genotypeMatching";
