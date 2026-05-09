/**
 * stableGeneration.ts - Stable generation
 *
 * This file provides functions for generating random stable names, owner names,
 * and filler stables with procedurally generated properties.
 *
 * Dependencies: @/game/types (Stable, StableTier, StablePersonality), @/game/rng (Rng), @/game/uuid (generateUUID), ./stableSelection (selectPersonality, getSpecialistPreferences), @/core/horse/visuals (randomSilk), ./stablePoolData (FILLER_PREFIXES, FILLER_SUFFIXES, FILLER_OWNERS, FILLER_COUNTRIES, StablePoolEntry)
 * Related files: stablePoolData.ts (provides pool data), stableSelection.ts (provides selection logic)
 */

import type { Stable, StableTier, StablePersonality } from "@/game/types";
import type { Rng } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import { selectPersonality, getSpecialistPreferences } from "@/core/stable/stableSelection";
import { randomSilk } from "@/core/horse/visuals";
import {
  FILLER_PREFIXES,
  FILLER_SUFFIXES,
  FILLER_OWNERS,
  FILLER_COUNTRIES,
  type StablePoolEntry,
} from "./stablePoolData";
import { FIRST_NAMES, LAST_NAMES } from "./personNames";

/**
 * Generate a random stable name using filler prefixes and suffixes.
 *
 * Combines a random prefix and suffix from the filler pool to create a unique stable name.
 *
 * @param rng - Random number generator
 * @returns Generated stable name
 */
export function randomStableName(rng: Rng): string {
  const prefix = rng.pick(FILLER_PREFIXES);
  const suffix = rng.pick(FILLER_SUFFIXES);
  return `${prefix} ${suffix}`;
}

/**
 * Generate a random owner name using procedural name pools.
 *
 * Selects a random first and last name to create a realistic person name.
 *
 * @param rng - Random number generator
 * @returns Generated owner name
 */
export function randomOwnerName(rng: Rng): string {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  return `${first} ${last}`;
}

/**
 * Generate a single filler stable.
 *
 * Creates a budget-tier stable with procedurally generated name, owner, country,
 * personality, and other properties. Used to populate the world with background stables.
 *
 * @param index - Index for generation (currently unused)
 * @param day - Current game day for founding date calculation
 * @param rng - Random number generator
 * @returns Generated filler stable
 */
export function generateFillerStable(index: number, day: number, rng: Rng): Stable {
  const prefix = rng.pick(FILLER_PREFIXES);
  const suffix = rng.pick(FILLER_SUFFIXES);
  const owner = randomOwnerName(rng);
  const country = rng.pick(FILLER_COUNTRIES);
  const personality = selectPersonality("budget", rng);
  const isSpecialist = personality === "specialist";

  return {
    id: generateUUID(rng),
    name: `${prefix} ${suffix}`,
    owner: owner,
    tier: "budget",
    reputation: rng.int(30, 55),
    founded: Math.max(1, day - rng.int(0, 365)),
    cash: rng.int(10000, 60000),
    horses: [],
    isMajor: false,
    colors: { primary: randomSilk(rng), secondary: randomSilk(rng) },
    country,
    personality,
    ...(isSpecialist ? getSpecialistPreferences(rng) : {}),
  };
}

/**
 * Generate a stable from a template pool entry.
 *
 * Creates a stable from a predefined template with tier-specific cash ranges,
 * reputation, founding date, and personality. Used for generating named stables.
 *
 * @param template - Stable pool entry with name and owner
 * @param tier - Stable tier (elite, mid, budget)
 * @param reputationRange - Min/max reputation range for the tier
 * @param day - Current game day for founding date calculation
 * @param rng - Random number generator
 * @returns Generated stable
 */
export function generateStableFromTemplate(
  template: StablePoolEntry,
  tier: StableTier,
  reputationRange: [number, number],
  day: number,
  rng: Rng,
): Stable {
  const [minRep, maxRep] = reputationRange;
  const personality = selectPersonality(tier, rng);
  const isSpecialist = personality === "specialist";

  // Calculate cash range based on tier
  let cashRange: [number, number];
  let foundedOffset: number;
  switch (tier) {
    case "elite":
      cashRange = [500000, 1000000];
      foundedOffset = 365 * 3;
      break;
    case "mid":
      cashRange = [150000, 350000];
      foundedOffset = 365 * 2;
      break;
    case "budget":
      cashRange = [20000, 100000];
      foundedOffset = 365;
      break;
  }

  return {
    ...template,
    id: generateUUID(rng),
    tier,
    reputation: rng.int(minRep, maxRep),
    founded: Math.max(1, day - foundedOffset),
    cash: rng.int(cashRange[0], cashRange[1]),
    horses: [],
    personality,
    ...(isSpecialist ? getSpecialistPreferences(rng) : {}),
  };
}
