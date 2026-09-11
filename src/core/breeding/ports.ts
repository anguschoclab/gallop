/**
 * breedingPorts.ts - Port interfaces for breeding compatibility functions.
 *
 * Defines the port interface that allows breeding compatibility calculations
 * to be injected rather than imported directly. This makes breeding logic
 * testable and allows implementations to be swapped.
 *
 * The default implementations are the core functions themselves (core→core
 * imports are allowed). When ports are not injected, callers use the defaults.
 *
 * Dependencies: @/core/breeding/genotypeMatching,
 *              @/core/breeding/inbreedingCalculator,
 *              @/core/breeding/traitCompatibility
 * Related files: src/core/breeding/compatibility.ts (consumer)
 */

import type { calculateGeneticCompatibility } from "@/core/breeding/genotypeMatching";
import type { calculateFounderEffect } from "@/core/breeding/inbreedingCalculator";
import type {
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
} from "@/core/breeding/traitCompatibility";

/**
 * Ports for breeding compatibility sub-calculations.
 * Each port matches the signature of the core implementation.
 */
export interface BreedingCompatibilityPorts {
  /** Calculate genetic compatibility between two horses. */
  geneticCompat: typeof calculateGeneticCompatibility;
  /** Calculate founder effect (inbreeding coefficient). */
  founderEffect: typeof calculateFounderEffect;
  /** Calculate conformation compatibility. */
  conformation: typeof calculateConformationCompatibility;
  /** Calculate temperament compatibility. */
  temperament: typeof calculateTemperamentCompatibility;
}
