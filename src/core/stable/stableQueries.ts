/**
 * stableQueries.ts - Stable query functions
 *
 * This file provides query functions for stables including get by ID,
 * get major stables, get by tier, calculate starting cash, and target horse count.
 *
 * Dependencies: @/game/types (Stable, StableTier), @/core/data/pedigreeData (PedigreeHorse), @/game/rng (Rng), ./stallionFarmMapping (STALLION_FARM_MAPPING)
 * Related files: stableGeneration.ts (uses queries), stallionFarmMapping.ts (provides mapping)
 */

import type { Stable, StableTier } from "@/game/types";
import type { PedigreeHorse } from "@/data/pedigreeData";
import type { Rng } from "@/core/common/rng";
import { nondeterministicRng } from "@/core/common/rng";
import { STALLION_FARM_MAPPING } from "@/core/stable/stallionFarmMapping";

/**
 * Get stable by ID.
 *
 * Finds and returns a stable with the specified ID from the stable array.
 *
 * @param stables - Array of stables to search
 * @param id - Stable ID to find
 * @returns Stable with matching ID, or undefined if not found
 */
export function getStableById(stables: Stable[], id: string): Stable | undefined {
  return stables.find((s) => s.id === id);
}

/**
 * Get all major stables (non-filler).
 *
 * Filters the stable array to return only major stables (isMajor: true).
 *
 * @param stables - Array of stables to filter
 * @returns Array of major stables
 */
export function getMajorStables(stables: Stable[]): Stable[] {
  return stables.filter((s) => s.isMajor);
}

/**
 * Get stables by tier.
 *
 * Filters the stable array to return only stables of the specified tier.
 *
 * @param stables - Array of stables to filter
 * @param tier - Stable tier to filter by (elite, mid, budget)
 * @returns Array of stables matching the tier
 */
export function getStablesByTier(stables: Stable[], tier: StableTier): Stable[] {
  return stables.filter((s) => s.tier === tier);
}

/**
 * Calculate starting cash for a stable based on tier.
 *
 * Returns a random starting cash amount appropriate for the stable tier.
 * Elite: 500k-1M, Mid: 150k-350k, Budget: 20k-70k.
 *
 * @param tier - Stable tier (elite, mid, budget)
 * @param rng - Random number generator
 * @returns Starting cash amount
 */
export function getStartingCashForTier(tier: StableTier, rng: Rng): number {
  switch (tier) {
    case "elite":
      return rng.int(500000, 1000000);
    case "mid":
      return rng.int(150000, 350000);
    case "budget":
      return rng.int(20000, 70000);
  }
}

/**
 * Calculate target horse count for a stable based on tier.
 *
 * Returns a random target horse count appropriate for the stable tier.
 * Elite: 30-40, Mid: 20-30, Budget: 15-25. Filler stables always have 10.
 *
 * @param tier - Stable tier (elite, mid, budget)
 * @param isMajor - Whether the stable is a major stable (non-filler)
 * @param rng - Random number generator
 * @returns Target horse count
 */
export function getTargetHorseCountForTier(tier: StableTier, isMajor: boolean, rng: Rng): number {
  if (!isMajor) return 10; // Filler stables always have 10
  switch (tier) {
    case "elite":
      return rng.int(30, 40); // 30-40
    case "mid":
      return rng.int(20, 30); // 20-30
    case "budget":
      return rng.int(15, 25); // 15-25
  }
}

/**
 * Map a famous stallion to an appropriate game stable.
 *
 * Uses real-world stud farm name to match with game stables, with tier-based fallback
 * based on stud fee if no match is found.
 *
 * @param stallion - Pedigree horse data with stud farm information
 * @param stables - Array of available stables
 * @returns Matching stable
 */
export function mapStallionToStable(stallion: PedigreeHorse, stables: Stable[], rng?: Rng): Stable {
  const _rng = rng || nondeterministicRng();
  // Try exact match first
  const exactMatch = stables.find((s) => s.name === stallion.studFarm);
  if (exactMatch) return exactMatch;

  // Map by stud farm name to game stable
  const mappedName = STALLION_FARM_MAPPING[stallion.studFarm || ""];
  if (mappedName) {
    const mapped = stables.find((s) => s.name === mappedName);
    if (mapped) return mapped;
  }

  // Fallback: assign by tier based on stud fee
  const tier =
    stallion.studFee && stallion.studFee >= 100000
      ? "elite"
      : stallion.studFee && stallion.studFee >= 25000
        ? "mid"
        : "budget";

  const tierStables = stables.filter((s) => s.tier === tier);
  if (tierStables.length === 0) {
    // If no stables of appropriate tier, return any stable
    return stables[Math.floor(_rng.next() * stables.length)];
  }

  return tierStables[Math.floor(_rng.next() * tierStables.length)];
}
