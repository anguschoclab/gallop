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

export function createRng(seed: number): Rng {
  let state = (seed | 0) || 1;
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

// FNV-1a 32-bit. Stable hash for deriving a seed from a string id.
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Convenience for fallback paths that genuinely don't need determinism
// (e.g. ad-hoc market refresh). Keep these rare — explicit seeds are better.
export function nondeterministicRng(): Rng {
  return createRng((Math.random() * 0xffffffff) | 0);
}
