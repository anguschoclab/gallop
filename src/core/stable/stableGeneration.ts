import type { Stable, StableTier, StablePersonality } from "@/game/types";
import type { Rng } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import { selectPersonality, getSpecialistPreferences } from "@/core/stable/stableSelection";

// Random silk color generator (hex)
export function randomSilk(rng: Rng): string {
  const hues = [0, 30, 60, 120, 180, 240, 270, 300, 330];
  const hue = rng.pick(hues);
  return `hsl(${hue}, 70%, 50%)`;
}

// Base stable info without generated fields
export type StablePoolEntry = Omit<
  Stable,
  | "id"
  | "founded"
  | "cash"
  | "horses"
  | "tier"
  | "reputation"
  | "personality"
  | "preferredDistance"
  | "preferredSurface"
>;

// Filler stable name components for generation
export const FILLER_PREFIXES = [
  "Oak",
  "Pine",
  "Maple",
  "Cedar",
  "Willow",
  "Birch",
  "Elm",
  "Ash",
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
  "Morning",
  "Evening",
  "Sunset",
  "Golden",
  "Silver",
  "Copper",
  "Iron",
  "Diamond",
  "Ruby",
  "Emerald",
  "Royal",
  "Crown",
  "Imperial",
  "Sovereign",
  "Regal",
  "Noble",
  "Running",
  "Galloping",
  "Flying",
  "Racing",
  "Thunder",
  "Lightning",
  "Prairie",
  "Meadow",
  "Valley",
  "Ridge",
  "Hill",
  "Brook",
  "Creek",
  "Star",
  "Moon",
  "Sun",
  "Sky",
  "Cloud",
  "Storm",
  "Rain",
  "Victory",
  "Champion",
  "Winner",
  "Triumph",
  "Glory",
];

export const FILLER_SUFFIXES = [
  "Racing",
  "Stables",
  "Farm",
  "Stud",
  "Thoroughbreds",
  "Bloodstock",
  "Ranch",
  "Meadows",
  "Acres",
  "Fields",
  "Estates",
  "Park",
  "Lane Stables",
  "Ridge Farm",
  "Valley Stud",
  "Hill Racing",
  "Downs",
  "Heights",
  "Hollow",
  "Glen",
  "Crossing",
  "Point",
];

const FILLER_OWNERS = [
  "Racing Partnership",
  "Thoroughbred LLC",
  "Bloodstock Group",
  "Racing Syndicate",
  "Farm Inc.",
  "Stables Ltd",
  "Racing Club",
  "Partnership Group",
  "Investment LLC",
  "Bloodstock Partners",
  "Racing Ventures",
  "Farm Group",
];

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

const FILLER_COUNTRIES = [
  "USA",
  "UK",
  "Ireland",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Japan",
  "Australia",
  "New Zealand",
  "Hong Kong",
  "Singapore",
  "UAE",
  "South Africa",
  "Argentina",
  "Brazil",
  "Canada",
];

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
