/**
 * npcHorseGenHelpers.ts - NPC horse generation helper functions
 *
 * This file provides helper functions for NPC horse generation including age category
 * rolling, age from category mapping, and starting fame calculation.
 *
 * Dependencies: ./types (StableTier), ./rng (Rng), @/core/common/random (rand)
 * Related files: npcHorseGen.ts (uses these helpers)
 */

import type { StableTier } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import { rand } from "@/core/common/random";

export type AgeCategory = "2yo" | "prime" | "veteran" | "breeding";

/**
 * Roll a random age category for NPC horse generation.
 *
 * Returns an age category based on weighted probabilities: 30% 2yo, 40% prime,
 * 20% veteran, 10% breeding age.
 *
 * @param rng - Random number generator
 * @returns Age category ("2yo", "prime", "veteran", or "breeding")
 */
export function rollAgeCategory(rng: Rng): AgeCategory {
  const r = rng.next();
  if (r < 0.3) return "2yo";
  if (r < 0.7) return "prime";
  if (r < 0.9) return "veteran";
  return "breeding";
}

/**
 * Get a specific age from an age category.
 *
 * Maps age categories to specific ages with some randomness for prime and veteran.
 *
 * @param cat - Age category
 * @param rng - Random number generator
 * @returns Age in years
 */
export function getAgeFromCategory(cat: AgeCategory, rng: Rng): number {
  switch (cat) {
    case "2yo":
      return 2;
    case "prime":
      return rng.next() < 0.5 ? 3 : 4;
    case "veteran":
      return rng.next() < 0.5 ? 5 : 6;
    case "breeding":
      return rand(7, 10, rng);
  }
}

/**
 * Calculate starting fame for an NPC horse.
 *
 * Calculates base fame based on stable tier, then adds age-based bonus.
 * Starting fame is deliberately low so the world begins largely unscouted:
 * only a handful of veteran elite runners clear the partial-visibility
 * threshold, everyone else has to be scouted before their stats are readable.
 *
 * @param tier - Stable tier
 * @param age - Horse age
 * @param rng - Random number generator
 * @returns Starting fame value (0-100)
 */
export function calculateStartingFame(tier: StableTier, age: number, rng: Rng): number {
  const base =
    tier === "elite" ? rand(10, 26, rng) : tier === "mid" ? rand(4, 14, rng) : rand(0, 8, rng);
  return Math.min(100, base + Math.max(0, age - 2) * 2);
}
