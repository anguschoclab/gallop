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
import type { PedigreeHorse } from "@/core/data/pedigreeData";
import type { Rng } from "@/game/rng";
import { STALLION_FARM_MAPPING } from "@/core/stable/stallionFarmMapping";

/**
 * Get stable by ID
 */
export function getStableById(stables: Stable[], id: string): Stable | undefined {
  return stables.find((s) => s.id === id);
}

/**
 * Get all major stables (non-filler)
 */
export function getMajorStables(stables: Stable[]): Stable[] {
  return stables.filter((s) => s.isMajor);
}

/**
 * Get stables by tier
 */
export function getStablesByTier(stables: Stable[], tier: StableTier): Stable[] {
  return stables.filter((s) => s.tier === tier);
}

/**
 * Calculate starting cash for a stable based on tier
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
 * Calculate target horse count for a stable based on tier
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
 * Map a famous stallion to an appropriate game stable
 * Uses real-world stud farm name to match with game stables, with tier-based fallback
 */
export function mapStallionToStable(stallion: PedigreeHorse, stables: Stable[]): Stable {
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
    return stables[Math.floor(Math.random() * stables.length)];
  }

  return tierStables[Math.floor(Math.random() * tierStables.length)];
}
