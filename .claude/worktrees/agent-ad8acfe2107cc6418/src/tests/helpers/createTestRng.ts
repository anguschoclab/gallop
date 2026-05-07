import { createRng, type Rng } from "@/game/rng";

/**
 * Creates a consistent test RNG instance
 */
export function createTestRng(seed: string = "test"): Rng {
  return createRng(seed);
}
