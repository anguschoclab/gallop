/**
 * rng.ts - Seeded RNG for reproducible gameplay
 *
 * This file provides seeded RNG used by race simulation, foal generation, and any
 * other gameplay code that needs to be reproducible from a deterministic input.
 * Uses the mulberry32 algorithm for small, well-distributed game RNG.
 *
 * Dependencies: None (self-contained functions)
 * Related files: Used throughout the codebase for deterministic random generation
 */

// Seeded RNG used by race simulation, foal generation, and any other gameplay
// code that needs to be reproducible from a deterministic input. Replays of
// the same race or pregnancy must produce identical outcomes.
//
// Algorithm: mulberry32. Small, well-distributed for game RNG, no crypto.

export type Rng = {
  next: () => number; // [0, 1)
  int: (min: number, max: number) => number; // inclusive
  range: (min: number, max: number) => number; // [min, max)
  pick: <T>(arr: readonly T[]) => T;
  // Box-Muller normal sample.
  gauss: (mean?: number, sd?: number) => number;
};

/**
 * Hash a 32-bit integer using MurmurHash3's 32-bit finalizer.
 *
 * Provides high-entropy mixing for numeric seeds.
 *
 * @param key - Integer to hash
 * @returns 32-bit hashed integer
 */
export function hashNum(key: number): number {
  let h = key | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Create a seeded random number generator.
 *
 * Uses the mulberry32 algorithm for deterministic random number generation.
 * Replays of the same race or pregnancy must produce identical outcomes.
 *
 * @param seed - Seed value (number or string)
 * @returns RNG interface with next, int, range, pick, and gauss methods
 */
export function createRng(seed: number | string): Rng {
  let state: number;
  if (typeof seed === "string") {
    state = hashStr(seed) | 0 || 1;
  } else {
    state = hashNum(seed) || 1;
  }
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    range: (min, max) => min + next() * (max - min),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    gauss: (mean = 0, sd = 1) => {
      // Box-Muller, single sample. Avoids storing spare in state so callers
      // can interleave with int/range without surprising correlations.
      const u = Math.max(1e-12, next());
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}

/**
 * Hash a string to a 32-bit integer using FNV-1a algorithm.
 *
 * Stable hash for deriving a seed from a string id.
 *
 * @param s - String to hash
 * @returns 32-bit hash value
 */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Create a non-deterministic RNG for fallback paths.
 *
 * Convenience for fallback paths that genuinely don't need determinism
 * (e.g. ad-hoc market refresh). Keep these rare — explicit seeds are better.
 *
 * @returns RNG interface with random seed
 */
export function nondeterministicRng(): Rng {
  let seed: number;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    seed = arr[0];
  } else {
    seed = (Math.random() * 0xffffffff) | 0;
  }
  return createRng(seed);
}
