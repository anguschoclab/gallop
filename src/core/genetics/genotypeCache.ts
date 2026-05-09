/**
 * genotypeCache.ts - In-memory caching for expensive genetic calculations
 *
 * This file provides caching for simulator results, COI calculations, bloodline
 * resolution, and breeding compatibility to avoid redundant computations.
 *
 * Dependencies: ./breedingSimulator (SimulationResult), ../breeding/populationGenetics (Bloodline), @/game/breedingCompatibility (BreedingCompatibilityResult)
 * Related files: breedingSimulator.ts (uses simulator cache), populationGenetics.ts (uses COI cache)
 */

/**
 * Genotype Cache
 * In-memory caching for expensive genetic calculations
 */

import type { SimulationResult } from "./breedingSimulator";
import type { Bloodline } from "@/core/breeding/populationGenetics";
import type { BreedingCompatibilityResult } from "@/game/breedingCompatibility";

// Simulator cache: key format "simulator:${sireId}:${damId}"
const simulatorCache = new Map<string, SimulationResult>();

// COI cache: key format "coi:${sireId}:${damId}" (never invalidated - pedigree immutable)
const coiCache = new Map<string, number>();

// Bloodline cache: key format "bloodline:${horseId}" (never invalidated - sire line doesn't change)
const bloodlineCache = new Map<string, Bloodline>();

// Compatibility cache: key format "compat:${sireId}:${damId}" (invalidated when race record changes)
const compatCache = new Map<string, BreedingCompatibilityResult>();

/**
 * Get or compute simulator result
 */
export function cachedSimulation(
  sireId: string,
  damId: string,
  computeFn: () => SimulationResult,
): SimulationResult {
  const key = `simulator:${sireId}:${damId}`;
  if (simulatorCache.has(key)) {
    return simulatorCache.get(key)!;
  }
  const result = computeFn();
  simulatorCache.set(key, result);
  return result;
}

/**
 * Get or compute COI
 */
export function cachedCoi(sireId: string, damId: string, computeFn: () => number): number {
  const key = `coi:${sireId}:${damId}`;
  if (coiCache.has(key)) {
    return coiCache.get(key)!;
  }
  const result = computeFn();
  coiCache.set(key, result);
  return result;
}

/**
 * Get or compute bloodline
 */
export function cachedBloodline(horseId: string, computeFn: () => Bloodline): Bloodline {
  const key = `bloodline:${horseId}`;
  if (bloodlineCache.has(key)) {
    return bloodlineCache.get(key)!;
  }
  const result = computeFn();
  bloodlineCache.set(key, result);
  return result;
}

/**
 * Get or compute compatibility
 */
export function cachedCompat(
  sireId: string,
  damId: string,
  computeFn: () => BreedingCompatibilityResult,
): BreedingCompatibilityResult {
  const key = `compat:${sireId}:${damId}`;
  if (compatCache.has(key)) {
    return compatCache.get(key)!;
  }
  const result = computeFn();
  compatCache.set(key, result);
  return result;
}

/**
 * Invalidate compatibility cache for a specific horse
 * Called when race results are applied (careerWins, earnings, blueHenStatus change)
 */
export function invalidateCompatFor(horseId: string): void {
  const keysToDelete: string[] = [];
  for (const key of compatCache.keys()) {
    if (key.startsWith(`compat:${horseId}:`) || key.endsWith(`:${horseId}`)) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    compatCache.delete(key);
  }
}

/**
 * Clear simulator cache
 * Called when genetic testing reveals new alleles (future feature)
 * or for session cleanup
 */
export function clearSimulatorCache(): void {
  simulatorCache.clear();
}

/**
 * Clear all caches
 * Called for session cleanup
 */
export function clearAllCaches(): void {
  simulatorCache.clear();
  coiCache.clear();
  bloodlineCache.clear();
  compatCache.clear();
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats(): {
  simulator: number;
  coi: number;
  bloodline: number;
  compat: number;
} {
  return {
    simulator: simulatorCache.size,
    coi: coiCache.size,
    bloodline: bloodlineCache.size,
    compat: compatCache.size,
  };
}
