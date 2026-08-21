/**
 * archetypeTripleCrown.ts - Triple Crown-focused breeding archetypes
 *
 * Extracted from archetypes.ts for modularity.
 */

import type { Archetype } from "./archetypeTypes";

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
    id: "triple-crown-european-turf",
    name: "European Turf Triple Crown Specialist",
    description:
      "Focus on European turf triple crowns (Ireland, France, Germany, Italy). High stamina for 2000-3000m staying races, turf surface, balanced speed/stamina for versatile distances, style P/S, peakAge 3-4",
    targetPhenotype: {
      speed: 0.7,
      stamina: 0.9,
      acceleration: 0.7,
      consistency: 0.8,
      distance: 2400,
      surface: "Turf",
      trainability: 0.75,
      durability: 0.85,
      peakAge: 4,
    },
    weights: { speed: 0.2, stamina: 0.45, acceleration: 0.15, consistency: 0.2 },
  },
  {
    id: "triple-crown-asian-turf",
    name: "Asian Turf Triple Crown Specialist",
    description:
      "Focus on Asian turf triple crowns (Japan, Hong Kong, Australia). High speed for 1600-3000m races, turf surface, early-maturing for Australian series, style P/S, peakAge 3",
    targetPhenotype: {
      speed: 0.8,
      stamina: 0.85,
      acceleration: 0.75,
      consistency: 0.8,
      distance: 2000,
      surface: "Turf",
      trainability: 0.8,
      durability: 0.85,
      peakAge: 3,
    },
    weights: { speed: 0.3, stamina: 0.35, acceleration: 0.15, consistency: 0.2 },
  },
  {
    id: "triple-crown-south-america",
    name: "South American Triple Crown Specialist",
    description:
      "Focus on South American triple crowns (Argentina, Brazil, Chile). Balanced speed/stamina for 1600-2500m races, dirt/turf surfaces, versatile for varying conditions, style P/S, peakAge 3",
    targetPhenotype: {
      speed: 0.75,
      stamina: 0.8,
      acceleration: 0.7,
      consistency: 0.8,
      distance: 2000,
      surface: "Versatile",
      trainability: 0.75,
      durability: 0.8,
      peakAge: 3,
    },
    weights: { speed: 0.3, stamina: 0.3, acceleration: 0.15, consistency: 0.25 },
  },
  {
    id: "triple-crown-hungary",
    name: "Hungarian Triple Crown Specialist",
    description:
      "Focus on Hungarian Triple Crown. Turf surface, stamina-focused for 1400-2800m progression, early speed for sprint leg, style P/S, peakAge 3",
    targetPhenotype: {
      speed: 0.7,
      stamina: 0.85,
      acceleration: 0.7,
      consistency: 0.8,
      distance: 2000,
      surface: "Turf",
      trainability: 0.75,
      durability: 0.85,
      peakAge: 3,
    },
    weights: { speed: 0.25, stamina: 0.4, acceleration: 0.15, consistency: 0.2 },
  },
  {
    id: "triple-tiara-turf",
    name: "Triple Tiara Turf Specialist",
    description:
      "Focus on fillies' triple tiaras on turf (Japan, Brazil). High speed for fillies' races, turf surface, early-maturing, style P, peakAge 3",
    targetPhenotype: {
      speed: 0.8,
      stamina: 0.75,
      acceleration: 0.8,
      consistency: 0.8,
      distance: 1800,
      surface: "Turf",
      trainability: 0.8,
      durability: 0.8,
      peakAge: 3,
    },
    weights: { speed: 0.35, stamina: 0.25, acceleration: 0.25, consistency: 0.15 },
  },
  {
    id: "triple-tiara-dirt",
    name: "Triple Tiara Dirt Specialist",
    description:
      "Focus on fillies' triple tiaras on dirt (USA, Canada). Balanced speed/stamina for fillies' races, dirt/synthetic surface, durable for series, style P/S, peakAge 3",
    targetPhenotype: {
      speed: 0.75,
      stamina: 0.8,
      acceleration: 0.75,
      consistency: 0.8,
      distance: 1800,
      surface: "Versatile",
      trainability: 0.75,
      durability: 0.85,
      peakAge: 3,
    },
    weights: { speed: 0.3, stamina: 0.3, acceleration: 0.2, consistency: 0.2 },
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

export const TRIPLE_CROWN_SERIES_TO_ARCHETYPE: Record<string, string> = {
  "usa-tc": "triple-crown-usa",
  "canada-tc": "triple-crown-canada",
  "uk-classics": "triple-crown-uk-classics",
  "ireland-tc": "triple-crown-european-turf",
  "france-tc": "triple-crown-european-turf",
  "germany-tc": "triple-crown-european-turf",
  "italy-tc": "triple-crown-european-turf",
  "japan-tc": "triple-crown-asian-turf",
  "hongkong-tc": "triple-crown-asian-turf",
  "australia-tc": "triple-crown-asian-turf",
  "argentina-tc": "triple-crown-south-america",
  "brazil-tc": "triple-crown-south-america",
  "chile-tc": "triple-crown-south-america",
  "hungary-tc": "triple-crown-hungary",
  "japan-tiara": "triple-tiara-turf",
  "brazil-tiara": "triple-tiara-turf",
  "usa-tiara": "triple-tiara-dirt",
  "canada-tiara": "triple-tiara-dirt",
};
