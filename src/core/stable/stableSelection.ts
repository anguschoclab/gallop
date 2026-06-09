/**
 * stableSelection.ts - Stable selection functions
 *
 * This file provides functions for selecting personalities based on tier weights,
 * shuffling and picking arrays, and getting specialist preferences.
 *
 * Dependencies: @/game/types (StableTier, StablePersonality), @/game/rng (Rng), ./stableConfig (PERSONALITY_WEIGHTS)
 * Related files: stableGeneration.ts (uses selection logic), stableConfig.ts (provides weights)
 */

import type { StableTier, StablePersonality } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import { PERSONALITY_WEIGHTS } from "./stableConfig";

/**
 * Shuffle array and return a random subset.
 *
 * Randomly shuffles the input array and returns the first N elements.
 *
 * @param array - Array to shuffle and pick from
 * @param count - Number of elements to pick
 * @param rng - Random number generator
 * @returns Random subset of the array
 */
export function shuffleAndPick<T>(array: T[], count: number, rng: Rng): T[] {
  const shuffled = [...array].sort(() => rng.next() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Select a random personality based on tier weights.
 *
 * Uses weighted random selection based on PERSONALITY_WEIGHTS configuration
 * to choose a personality appropriate for the given stable tier.
 *
 * @param tier - Stable tier (elite, mid, budget)
 * @param rng - Random number generator
 * @returns Selected personality
 */
export function selectPersonality(tier: StableTier, rng: Rng): StablePersonality {
  const weights = PERSONALITY_WEIGHTS[tier];
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  let randomVal = rng.next() * totalWeight;

  for (const [personality, weight] of Object.entries(weights)) {
    randomVal -= weight || 0;
    if (randomVal <= 0) {
      return personality as StablePersonality;
    }
  }

  return "conservative"; // Fallback
}

/**
 * Get random specialist preferences for specialist personality.
 *
 * Generates random preferred distance and surface for specialist stables.
 *
 * @param rng - Random number generator
 * @returns Object with preferredDistance and preferredSurface
 */
export function getSpecialistPreferences(rng: Rng) {
  const distances = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
  const surfaces: ("Turf" | "Dirt" | "Synthetic")[] = ["Turf", "Dirt", "Synthetic"];

  return {
    preferredDistance: rng.pick(distances),
    preferredSurface: rng.pick(surfaces),
  };
}
