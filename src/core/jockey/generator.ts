/**
 * jockeyGen.ts - Jockey generation
 *
 * This file provides jockey generation with archetypes, stats, traits, and silk
 * customization based on tier and region.
 *
 * Dependencies: @/game/uuid (generateUUID), @/game/rng (Rng), ./types (Jockey, JockeyArchetype, JockeyStats, JockeyTrait, JockeySilk, RegionalSystem), @/core/jockey/proceduralNaming (generateProceduralJockeyName), ./jockeyData (ARCHETYPES, SILK_PALETTE, SILK_PATTERNS)
 * Related files: jockeyData.ts (provides constants), npcStables.ts (uses jockey generation)
 */

import { generateUUID } from "@/core/uuid";
import type { Rng } from "@/core/common/rng";
import type { Jockey, JockeyArchetype, JockeyStats, JockeyTrait, JockeySilk } from "./types";
import { generateProceduralJockeyName } from "@/core/jockey/proceduralNaming";
import type { RegionalSystem } from "@/core/race/types";
import { createApprenticeProgression } from "@/core/apprentice/apprenticeTypes";
import {
  JOCKEY_SALARY_ELITE_MIN,
  JOCKEY_SALARY_ELITE_MAX,
  JOCKEY_SALARY_MID_MIN,
  JOCKEY_SALARY_MID_MAX,
  JOCKEY_SALARY_BUDGET_MIN,
  JOCKEY_SALARY_BUDGET_MAX,
  JOCKEY_AGE_MIN,
  JOCKEY_AGE_MAX,
} from "@/constants";
import { ARCHETYPES, SILK_PALETTE, SILK_PATTERNS } from "@/data/jockeys";
export { ARCHETYPES, SILK_PALETTE, SILK_PATTERNS };

export type JockeyGenerationOptions = {
  tier?: "budget" | "mid" | "elite";
  rng: Rng;
  region?: RegionalSystem;
  usedNames?: Set<string>;
};

/**
 * Archetype Strategy for jockey generation.
 */
interface ArchetypeStrategy {
  apply: (stats: JockeyStats, traits: JockeyTrait[], rng: Rng) => void;
}

/**
 * Registry of archetype strategies indexed by jockey archetype.
 */
const JOCKEY_ARCHETYPE_STRATEGIES: Record<JockeyArchetype, ArchetypeStrategy> = {
  front_runner: {
    apply: (stats, traits, rng) => {
      stats.gateSkill += 15;
      stats.pacing += 10;
      stats.vigor -= 10;
      traits.push("gate_master");
      if (rng.next() < 0.5) {
        traits.push(rng.pick(["sprint_specialist", "pace_presser"]));
      }
    },
  },
  closer: {
    apply: (stats, traits, rng) => {
      stats.vigor += 15;
      stats.positioning += 10;
      stats.gateSkill -= 10;
      traits.push("hill_specialist");
      if (rng.next() < 0.5) {
        traits.push(rng.pick(["closer_instinct", "staying_specialist"]));
      }
    },
  },
  clinical: {
    apply: (stats, traits, rng) => {
      stats.positioning += 15;
      stats.pacing += 10;
      traits.push("bullring_expert");
      if (rng.next() < 0.5) {
        traits.push(rng.pick(["turf_specialist", "dirt_specialist"]));
      }
    },
  },
  finisher: {
    apply: (stats, traits, rng) => {
      stats.vigor += 20;
      stats.gateSkill += 5;
      stats.pacing -= 10;
      traits.push("long_straight_pro");
      if (rng.next() < 0.5) {
        traits.push(rng.pick(["closer_instinct", "big_match_temperament"]));
      }
    },
  },
  versatile: {
    apply: (stats, traits, rng) => {
      stats.pacing += 5;
      stats.positioning += 5;
      stats.vigor += 5;
      stats.gateSkill += 5;
      stats.temperament += 5;
      if (rng.next() < 0.2) traits.push(rng.pick(["gate_master", "hill_specialist"]));
      if (rng.next() < 0.15) traits.push(rng.pick(["pace_presser", "veteran_poise"]));
    },
  },
};

/**
 * Generate a jockey with archetypes, stats, traits, and silk customization.
 *
 * Creates a jockey with tier-based stat ranges, archetype bonuses, career history,
 * and custom silk colors. Stats are clamped to valid ranges.
 *
 * @param options - Jockey generation options
 * @param options.tier - Stat tier (budget, mid, elite)
 * @param options.rng - Random number generator
 * @param options.region - Regional system for naming
 * @param options.usedNames - Optional set of used names to avoid duplicates
 * @returns Generated jockey object
 */
export function generateJockey({
  tier = "mid",
  rng,
  region = "north_america",
  usedNames,
}: JockeyGenerationOptions): Jockey {
  const archetype = rng.pick(ARCHETYPES);
  const name = generateProceduralJockeyName(region, rng, usedNames);
  if (usedNames) usedNames.add(name.toLowerCase());

  const baseMin = tier === "elite" ? 75 : tier === "mid" ? 55 : 35;
  const baseMax = tier === "elite" ? 98 : tier === "mid" ? 80 : 60;

  const stats: JockeyStats = {
    pacing: rng.range(baseMin, baseMax),
    positioning: rng.range(baseMin, baseMax),
    vigor: rng.range(baseMin, baseMax),
    gateSkill: rng.range(baseMin, baseMax),
    temperament: rng.range(baseMin, baseMax),
  };

  const traits: JockeyTrait[] = [];

  // Apply archetype bonuses and traits via strategy pattern
  JOCKEY_ARCHETYPE_STRATEGIES[archetype].apply(stats, traits, rng);

  // Elite jockeys get an extra roll for a tertiary trait from any pool
  if (tier === "elite" && rng.next() < 0.3) {
    const allTraits: JockeyTrait[] = [
      "gate_master",
      "hill_specialist",
      "bullring_expert",
      "long_straight_pro",
      "turf_specialist",
      "dirt_specialist",
      "mud_master",
      "sprint_specialist",
      "staying_specialist",
      "pace_presser",
      "big_match_temperament",
      "veteran_poise",
      "closer_instinct",
    ];
    const available = allTraits.filter((t) => !traits.includes(t));
    if (available.length > 0) {
      traits.push(rng.pick(available));
    }
  }

  // Clamp stats
  Object.keys(stats).forEach((k) => {
    stats[k as keyof JockeyStats] = Math.min(100, Math.max(10, stats[k as keyof JockeyStats]));
  });

  const currentAbility =
    (stats.pacing + stats.positioning + stats.vigor + stats.gateSkill + stats.temperament) / 5;

  const basePotential =
    tier === "elite"
      ? 78 + rng.range(0, 20)
      : tier === "mid"
        ? 60 + rng.range(0, 20)
        : 40 + rng.range(0, 25);

  const potential = Math.max(currentAbility, basePotential);

  // Career history: older jockeys have more starts
  const age = JOCKEY_AGE_MIN + Math.floor(rng.next() * (JOCKEY_AGE_MAX - JOCKEY_AGE_MIN));
  const yearsActive = age - 18;
  const careerStarts = Math.floor(yearsActive * (50 + rng.next() * 150));
  const winRate = 0.05 + (stats.vigor + stats.pacing) / 1000 + rng.next() * 0.1;
  const careerWins = Math.floor(careerStarts * winRate);

  const totalStats =
    (stats.pacing + stats.positioning + stats.vigor + stats.gateSkill + stats.temperament) / 5;

  return {
    id: generateUUID(),
    name,
    age,
    archetype,
    stats,
    potential,
    traits,
    silk: generateSilk(rng),
    careerStarts,
    careerWins,
    fame: Math.min(100, totalStats + careerWins / 100),
    ridingFee: Math.round(50 + Math.min(100, totalStats + careerWins / 100) * 10),
    affinityMap: {},
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 100,
  };
}

/**
 * Generate an apprentice jockey (teenager, low stats, high potential for academy).
 * @param options - Options object
 * @param options.rng - Random number generator
 * @param options.region - Region for jockey generation (default north_america)
 * @param options.usedNames - Set of already used names
 * @returns Generated apprentice jockey
 */
export function generateApprentice({
  rng,
  region = "north_america",
  usedNames,
}: Omit<JockeyGenerationOptions, "tier">): Jockey {
  const jockey = generateJockey({ tier: "budget", rng, region, usedNames });
  return {
    ...jockey,
    age: rng.range(16, 18),
    careerStarts: 0,
    careerWins: 0,
    fame: 10,
    ridingFee: 50,
    isApprentice: true,
    loyalty: 100,
    apprenticeProgression: createApprenticeProgression(jockey.id, 0),
  };
}

/**
 * Generate a jockey silk with colors and pattern.
 *
 * Selects primary, secondary, and cap colors from the palette, ensuring
 * primary and secondary are different. Applies a random pattern.
 *
 * @param rng - Random number generator
 * @returns Jockey silk object with pattern and colors
 */
export function generateSilk(rng: Rng): JockeySilk {
  const primary = rng.pick(SILK_PALETTE);
  let secondary = rng.pick(SILK_PALETTE);
  // Avoid same color
  let tries = 0;
  while (secondary === primary && tries++ < 5) secondary = rng.pick(SILK_PALETTE);
  const cap = rng.pick(SILK_PALETTE);
  const pattern = rng.pick(SILK_PATTERNS);
  return { pattern, primary, secondary, cap };
}

/**
 * Generate initial jockeys for the game.
 *
 * Creates a specified number of jockeys with randomized tiers and regions.
 * Distributes across regional systems for variety.
 *
 * @param rng - Random number generator
 * @param count - Number of jockeys to generate (default: 20)
 * @param usedNames - Optional set of used names to avoid duplicates
 * @returns Array of generated jockeys
 */
export function generateInitialJockeys(
  rng: Rng,
  count: number = 20,
  usedNames?: Set<string>,
): Jockey[] {
  const jockeys: Jockey[] = [];
  const regions: RegionalSystem[] = [
    "north_america",
    "europe",
    "australia",
    "asia",
    "south_america",
  ];

  for (let i = 0; i < count; i++) {
    const r = rng.next();
    const tier = r < 0.15 ? "elite" : r < 0.6 ? "mid" : "budget";
    const region = regions[i % regions.length];
    jockeys.push(generateJockey({ tier, rng, region, usedNames }));
  }
  return jockeys;
}
