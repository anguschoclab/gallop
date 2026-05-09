/**
 * npcStables.ts - NPC stable definitions and generation
 *
 * This file provides NPC stable generation using a pool-based system with configurable
 * named stables and filler generation, refactored to use modular configuration and
 * generation systems.
 *
 * Dependencies: ./types (Stable), ./rng (Rng), @/core/stable/stableConfig (STABLE_CONFIG), @/core/stable/stableSelection (shuffleAndPick), @/core/stable/stableGeneration (generateFillerStable, generateStableFromTemplate), @/core/breeding/archetypes (ORIGINAL_ARCHETYPES, TRIPLE_CROWN_ARCHETYPES), @/core/stable/stablePoolData (ELITE_POOL, MID_POOL, BUDGET_POOL)
 * Related files: npcHorseGen.ts (uses stables for horse generation), npcBreeding.ts (uses stables for breeding)
 */

// NPC Stable Definitions - Configurable named stables + filler generation
// Pool-based system: Large pools of named stables, config determines how many spawn
// Refactored to use modular configuration and generation systems

import type { Stable } from "./types";
import type { Rng } from "@/game/rng";
import { STABLE_CONFIG } from "@/core/stable/stableConfig";
import {
  shuffleAndPick,
} from "@/core/stable/stableSelection";
import {
  generateFillerStable,
  generateStableFromTemplate,
} from "@/core/stable/stableGeneration";
import { ORIGINAL_ARCHETYPES, TRIPLE_CROWN_ARCHETYPES } from "@/core/breeding/archetypes";
import { ELITE_POOL, MID_POOL, BUDGET_POOL } from "@/core/stable/stablePoolData";

/**
 * Generate all NPC stables (named + filler).
 *
 * Named stables are randomly selected from pools based on config counts.
 * Assigns breeding archetypes based on tier and personality.
 *
 * @param day - Current game day
 * @param rng - Random number generator
 * @param config - Stable configuration (defaults to STABLE_CONFIG)
 * @returns Array of generated stable objects
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
      // Elite tier prestige: random triple crown archetype (any of the new archetypes)
      if (stable.personality === "prestige") {
        const allTCArchetypes = TRIPLE_CROWN_ARCHETYPES.filter(
          (a) => a.id !== "triple-crown-specialist", // Exclude generic specialist
        );
        stable.breedingArchetype =
          allTCArchetypes.length > 0 ? rng.pick(allTCArchetypes).id : undefined;
      }
      // Elite tier specialist: random specialist archetype (including new ones)
      else if (stable.personality === "specialist") {
        const specialistArchetypes = ORIGINAL_ARCHETYPES.filter(
          (a) => a.id === "dirt-sprinter" || a.id === "turf-specialist" || a.id === "iron-horse",
        ).concat(
          TRIPLE_CROWN_ARCHETYPES.filter((a) => a.id !== "triple-crown-specialist")
        );
        stable.breedingArchetype =
          specialistArchetypes.length > 0 ? rng.pick(specialistArchetypes).id : undefined;
      }
    } else if (stable.tier === "mid" && stable.isMajor) {
      // Mid tier: random archetype including new triple crown archetypes
      const midTierArchetypes = [
        ...ORIGINAL_ARCHETYPES,
        ...TRIPLE_CROWN_ARCHETYPES.filter((a) => a.id !== "triple-crown-specialist"),
      ];
      stable.breedingArchetype = rng.pick(midTierArchetypes).id;
    }
    // Budget/starter tier: no archetype (undefined)
  }

  return stables;
}
