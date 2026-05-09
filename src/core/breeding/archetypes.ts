/**
 * archetypes.ts - Breeding Archetypes
 *
 * This file provides predefined breeding program targets with genetic specifications.
 * Archetypes define target phenotypes (speed, stamina, acceleration, etc.) and stat
 * weights for different types of horses (sprinters, stayers, milers, etc.).
 *
 * Dependencies: None (self-contained type definitions and data)
 * Related files: strategy.ts (uses archetypes for scoring), programs.ts (breeding program management)
 */

/**
 * Breeding Archetypes
 * Predefined breeding program targets with genetic specifications
 */

export type Archetype = {
  id: string;
  name: string;
  description: string;
  targetPhenotype: {
    speed: number; // 0-1 normalized
    stamina: number; // 0-1 normalized
    acceleration: number; // 0-1 normalized
    consistency: number; // 0-1 normalized
    distance: number; // preferred distance in meters
    surface: "Turf" | "Dirt" | "Synthetic" | "Versatile";
    trainability: number; // 0-1 normalized
    durability: number; // 0-1 normalized
    peakAge: number; // 3-7
  };
  weights: {
    speed: number;
    stamina: number;
    acceleration: number;
    consistency: number;
  };
};

/**
 * Original 8 archetypes
 */
export const ORIGINAL_ARCHETYPES: Archetype[] = [
  {
    id: "elite-turf-stayer",
    name: "Elite Turf Stayer",
    description:
      "High stamina for long turf races, balanced speed/stamina, surface Turf, style S/P",
    targetPhenotype: {
      speed: 0.7,
      stamina: 0.9,
      acceleration: 0.6,
      consistency: 0.8,
      distance: 2400,
      surface: "Turf",
      trainability: 0.7,
      durability: 0.8,
      peakAge: 4,
    },
    weights: { speed: 0.2, stamina: 0.4, acceleration: 0.1, consistency: 0.3 },
  },
  {
    id: "dirt-sprinter",
    name: "Dirt Sprinter",
    description: "High speed, fiber sprinter, distance ≤1200m, surface Dirt",
    targetPhenotype: {
      speed: 0.9,
      stamina: 0.5,
      acceleration: 0.85,
      consistency: 0.7,
      distance: 1000,
      surface: "Dirt",
      trainability: 0.6,
      durability: 0.6,
      peakAge: 3,
    },
    weights: { speed: 0.5, stamina: 0.1, acceleration: 0.3, consistency: 0.1 },
  },
  {
    id: "classic-miler",
    name: "Classic Miler",
    description: "Balanced speed/stamina, distance 1600m, versatile surface",
    targetPhenotype: {
      speed: 0.8,
      stamina: 0.75,
      acceleration: 0.75,
      consistency: 0.75,
      distance: 1600,
      surface: "Versatile",
      trainability: 0.7,
      durability: 0.7,
      peakAge: 3,
    },
    weights: { speed: 0.3, stamina: 0.3, acceleration: 0.2, consistency: 0.2 },
  },
  {
    id: "turf-specialist",
    name: "Turf Specialist",
    description: "High acceleration, cornering, climbing, surface Turf",
    targetPhenotype: {
      speed: 0.7,
      stamina: 0.7,
      acceleration: 0.85,
      consistency: 0.8,
      distance: 1800,
      surface: "Turf",
      trainability: 0.75,
      durability: 0.7,
      peakAge: 4,
    },
    weights: { speed: 0.25, stamina: 0.25, acceleration: 0.35, consistency: 0.15 },
  },
  {
    id: "iron-horse",
    name: "Iron Horse",
    description: "High durability, recovery, consistency, low health risk",
    targetPhenotype: {
      speed: 0.6,
      stamina: 0.7,
      acceleration: 0.6,
      consistency: 0.9,
      distance: 2000,
      surface: "Versatile",
      trainability: 0.7,
      durability: 0.95,
      peakAge: 5,
    },
    weights: { speed: 0.15, stamina: 0.25, acceleration: 0.1, consistency: 0.5 },
  },
  {
    id: "early-developer",
    name: "Early Developer",
    description: "Low peakAge, high acceleration, sprinter/miler",
    targetPhenotype: {
      speed: 0.8,
      stamina: 0.6,
      acceleration: 0.85,
      consistency: 0.7,
      distance: 1200,
      surface: "Versatile",
      trainability: 0.8,
      durability: 0.6,
      peakAge: 2,
    },
    weights: { speed: 0.35, stamina: 0.15, acceleration: 0.35, consistency: 0.15 },
  },
  {
    id: "late-bloomer",
    name: "Late Bloomer",
    description: "High peakAge, stamina dominant, trainability",
    targetPhenotype: {
      speed: 0.6,
      stamina: 0.9,
      acceleration: 0.6,
      consistency: 0.75,
      distance: 2400,
      surface: "Versatile",
      trainability: 0.8,
      durability: 0.75,
      peakAge: 6,
    },
    weights: { speed: 0.15, stamina: 0.5, acceleration: 0.1, consistency: 0.25 },
  },
  {
    id: "all-weather",
    name: "All-Weather",
    description: "Versatile surface, balanced stats, high mental",
    targetPhenotype: {
      speed: 0.75,
      stamina: 0.75,
      acceleration: 0.75,
      consistency: 0.8,
      distance: 1600,
      surface: "Synthetic",
      trainability: 0.7,
      durability: 0.7,
      peakAge: 4,
    },
    weights: { speed: 0.25, stamina: 0.25, acceleration: 0.25, consistency: 0.25 },
  },
];

/**
 * Triple Crown-focused archetypes
 */
export const TRIPLE_CROWN_ARCHETYPES: Archetype[] = [
  {
    id: "triple-crown-usa",
    name: "USA Triple Crown Specialist",
    description:
      "Focus on US Triple Crown. High stamina for 1.5 mile Belmont, balanced speed/stamina for Derby/Preakness, high durability for 3-race series in 5 weeks, surface Dirt, style P/S, peakAge 3",
    targetPhenotype: {
      speed: 0.8,
      stamina: 0.85,
      acceleration: 0.75,
      consistency: 0.8,
      distance: 2000,
      surface: "Dirt",
      trainability: 0.8,
      durability: 0.9,
      peakAge: 3,
    },
    weights: { speed: 0.3, stamina: 0.35, acceleration: 0.15, consistency: 0.2 },
  },
  {
    id: "triple-crown-canada",
    name: "Canadian Triple Crown Specialist",
    description:
      "Focus on Canadian Triple Crown. Similar to USA but with Canadian race conditions (Woodbine track). High stamina for longest leg, balanced speed/stamina for shorter legs, high durability for series, surface Dirt or Synthetic, style P/S, peakAge 3",
    targetPhenotype: {
      speed: 0.75,
      stamina: 0.85,
      acceleration: 0.7,
      consistency: 0.8,
      distance: 2000,
      surface: "Versatile",
      trainability: 0.75,
      durability: 0.85,
      peakAge: 3,
    },
    weights: { speed: 0.25, stamina: 0.4, acceleration: 0.15, consistency: 0.2 },
  },
  {
    id: "triple-crown-uk-classics",
    name: "UK Classics Specialist",
    description:
      "Focus on UK Classics. Turf surface, varying distances (1 mile to 1.75 mile), longer series duration (May-September), high stamina for St Leger, balanced speed/stamina for Guineas and Derby, surface Turf, style P/S, peakAge 3",
    targetPhenotype: {
      speed: 0.75,
      stamina: 0.9,
      acceleration: 0.7,
      consistency: 0.8,
      distance: 2400,
      surface: "Turf",
      trainability: 0.75,
      durability: 0.85,
      peakAge: 3,
    },
    weights: { speed: 0.25, stamina: 0.4, acceleration: 0.15, consistency: 0.2 },
  },
  {
    id: "triple-crown-specialist",
    name: "Triple Crown Specialist",
    description:
      "Aggressive focus on Triple Crown achievement regardless of region. Very high stamina (for longest leg), high speed (for shortest leg), elite durability and recovery, zero health risks, peakAge exactly 3, mental excellent, trainability excellent, surface versatile",
    targetPhenotype: {
      speed: 0.85,
      stamina: 0.9,
      acceleration: 0.8,
      consistency: 0.85,
      distance: 2000,
      surface: "Versatile",
      trainability: 0.9,
      durability: 0.95,
      peakAge: 3,
    },
    weights: { speed: 0.3, stamina: 0.35, acceleration: 0.15, consistency: 0.2 },
  },
];

/**
 * All archetypes combined
 */
export const ALL_ARCHETYPES: Archetype[] = [...ORIGINAL_ARCHETYPES, ...TRIPLE_CROWN_ARCHETYPES];

/**
 * Get archetype by ID.
 *
 * @param id - The archetype ID to search for
 * @returns The archetype with matching ID, or undefined
 *
 * @example
 * const archetype = getArchetypeById("elite-turf-stayer");
 */
export function getArchetypeById(id: string): Archetype | undefined {
  return ALL_ARCHETYPES.find((a) => a.id === id);
}

/**
 * Get archetypes by surface preference.
 *
 * @param surface - The surface type to filter by
 * @returns Array of archetypes that prefer the given surface
 *
 * @example
 * const turfArchetypes = getArchetypesBySurface("Turf");
 */
export function getArchetypesBySurface(
  surface: "Turf" | "Dirt" | "Synthetic" | "Versatile",
): Archetype[] {
  return ALL_ARCHETYPES.filter((a) => a.targetPhenotype.surface === surface);
}
