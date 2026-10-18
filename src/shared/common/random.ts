/**
 * random.ts - Random utility functions
 *
 * This file provides pure numeric random utility functions and re-;

/**
 * Generate random integer in range [min, max] (inclusive).
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param rng - Random number generator
 * @returns Random integer in range
 *
 * @example
 * const value = rand(1, 10, rng);
 */
export function rand(min: number, max: number, rng: Rng): number {
  return rng.int(min, max);
}

// Domain-specific re-;
;
;
