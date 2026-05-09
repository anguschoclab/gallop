// NPC Stable Definitions - Configurable named stables + filler generation
// Pool-based system: Large pools of named stables, config determines how many spawn
// Refactored to use modular configuration and generation systems

import type { Stable, StableTier } from "./types";
import type { PedigreeHorse } from "@/core/data/pedigreeData";
import type { Rng } from "@/game/rng";
import { PERSONALITY_CONFIG, STABLE_CONFIG } from "@/core/stable/stableConfig";
import {
  shuffleAndPick,
  selectPersonality,
  getSpecialistPreferences,
} from "@/core/stable/stableSelection";
import {
  generateFillerStable,
  generateStableFromTemplate,
} from "@/core/stable/stableGeneration";
import { ORIGINAL_ARCHETYPES, TRIPLE_CROWN_ARCHETYPES } from "@/core/breeding/archetypes";
import { ELITE_POOL, MID_POOL, BUDGET_POOL, type StablePoolEntry } from "@/core/stable/stablePoolData";
import { STALLION_FARM_MAPPING } from "@/core/stable/stallionFarmMapping";

/**
 * Generate all NPC stables (named + filler)
 * Named stables are randomly selected from pools based on config counts
 */
export function generateAllStables(day: number, rng: Rng, config = STABLE_CONFIG): Stable[] {
  const stables: Stable[] = [];

  // Select and create elite stables from pool
  const selectedElite = shuffleAndPick(ELITE_POOL, config.elite.count, rng);
  for (const template of selectedElite) {
    stables.push(
      generateStableFromTemplate(template, "elite", config.elite.reputationRange, day, rng),
    );
  }

  // Select and create mid-tier stables from pool
  const selectedMid = shuffleAndPick(MID_POOL, config.mid.count, rng);
  for (const template of selectedMid) {
    stables.push(generateStableFromTemplate(template, "mid", config.mid.reputationRange, day, rng));
  }

  // Select and create budget stables from pool
  const selectedBudget = shuffleAndPick(BUDGET_POOL, config.budget.count, rng);
  for (const template of selectedBudget) {
    stables.push(
      generateStableFromTemplate(template, "budget", config.budget.reputationRange, day, rng),
    );
  }

  // Create filler stables
  for (let i = 0; i < config.filler.count; i++) {
    stables.push(generateFillerStable(i, day, rng));
  }

  // Assign breeding archetypes based on tier/personality
  for (const stable of stables) {
    if (stable.tier === "elite" && stable.isMajor) {
      // Elite tier prestige: regional Triple Crown archetype (random for elite stables)
      if (stable.personality === "prestige") {
        const tripleCrownArchetypes = TRIPLE_CROWN_ARCHETYPES.filter(
          (a) => a.id === "triple-crown-specialist",
        );
        stable.breedingArchetype =
          tripleCrownArchetypes.length > 0 ? rng.pick(tripleCrownArchetypes).id : undefined;
      }
      // Elite tier specialist: random specialist archetype
      else if (stable.personality === "specialist") {
        const specialistArchetypes = ORIGINAL_ARCHETYPES.filter(
          (a) => a.id === "dirt-sprinter" || a.id === "turf-specialist" || a.id === "iron-horse",
        );
        stable.breedingArchetype =
          specialistArchetypes.length > 0 ? rng.pick(specialistArchetypes).id : undefined;
      }
    } else if (stable.tier === "mid" && stable.isMajor) {
      // Mid tier: random original archetype
      stable.breedingArchetype = rng.pick(ORIGINAL_ARCHETYPES).id;
    }
    // Budget/starter tier: no archetype (undefined)
  }

  return stables;
}

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
