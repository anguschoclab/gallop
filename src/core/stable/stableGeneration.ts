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

/**
 * Generate a random stable name using filler prefixes and suffixes
 */
export function randomStableName(rng: Rng): string {
  const prefix = rng.pick(FILLER_PREFIXES);
  const suffix = rng.pick(FILLER_SUFFIXES);
  return `${prefix} ${suffix}`;
}

/**
 * Generate a random owner name using filler owners
 */
export function randomOwnerName(rng: Rng): string {
  return rng.pick(FILLER_OWNERS);
}

/**
 * Generate a single filler stable
 */
export function generateFillerStable(index: number, day: number, rng: Rng): Stable {
  const prefix = rng.pick(FILLER_PREFIXES);
  const suffix = rng.pick(FILLER_SUFFIXES);
  const owner = rng.pick(FILLER_OWNERS);
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
 * Generate a stable from a template pool entry
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
