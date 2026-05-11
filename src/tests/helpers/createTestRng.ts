import { createRng, type Rng } from "@/game/rng";

/**
 * Creates a consistent test RNG instance with a default seed.
 *
 * @param seed - Seed string for determinism (defaults to "test")
 * @returns Rng instance
 */
export function createTestRng(seed: string = "test"): Rng {
  return createRng(seed);
}
