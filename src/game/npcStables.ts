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
