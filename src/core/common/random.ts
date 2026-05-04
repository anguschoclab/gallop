/**
 * Pure random utility functions
 * Extracted from: horseGen.ts, npcHorseGen.ts, names.ts
 */

import type {
  Conformation,
  Temperament,
  GeneticMarkers,
  RunningStyle,
  CoatColor,
  Weather,
  TrackCondition,
} from "@/game/types";

/**
 * Generate random integer in range [min, max] (inclusive)
 */
export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random conformation quality
 */
export function randConformation(): Conformation {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

/**
 * Generate random temperament quality
 */
export function randTemperament(): Temperament {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

/**
 * Generate random genetic quality rating
 */
export function randGeneticQuality(): "excellent" | "good" | "fair" | "poor" {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

/**
 * Generate genetic markers for a horse
 */
export function generateGeneticMarkers(): GeneticMarkers {
  // Based on horse genome research - genes governing sensory perception, signal transduction, and immunity
  return {
    sensoryPerception: randGeneticQuality(),
    signalTransduction: randGeneticQuality(),
    immunity: randGeneticQuality(),
    geneticDiversity: Math.random() * 0.5 + 0.5, // Random diversity score 0.5-1.0
  };
}

/**
 * Pick a running style biased by the horse's stat profile. Speed/acceleration
 * tilt toward front-runner; stamina tilts toward closer; balanced horses lean
 * stalker. There's still randomness so identical-stat horses can differ.
 */
export function rollRunningStyle(stats: {
  speed: number;
  stamina: number;
  acceleration: number;
}): RunningStyle {
  const earlyBias = (stats.speed + stats.acceleration) / 2;
  const lateBias = stats.stamina;
  const tilt = earlyBias - lateBias; // ~ -50..+50
  const r = Math.random() * 100 - tilt; // tilt shifts the distribution
  if (r < 25) return "front-runner";
  if (r < 55) return "stalker";
  if (r < 80) return "mid-pack";
  return "closer";
}

/**
 * Generate random coat color
 */
export function randomCoatColor(): CoatColor {
  const colors: CoatColor[] = [
    "bay",
    "black",
    "chestnut",
    "dark-bay",
    "gray",
    "roan",
    "palomino",
    "white",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Generate random weather condition
 */
export function randomWeather(): Weather {
  const r = Math.random();
  if (r < 0.45) return "sunny";
  if (r < 0.7) return "cloudy";
  if (r < 0.85) return "rainy";
  if (r < 0.95) return "sunset";
  return "night";
}

/**
 * Generate random track condition
 */
export function randomTrackCondition(): TrackCondition {
  const r = Math.random();
  if (r < 0.6) return "fast";
  if (r < 0.85) return "good";
  if (r < 0.95) return "soft";
  return "heavy";
}

/**
 * Generate random horse name
 */
const ADJECTIVES = [
  "Thunder",
  "Silver",
  "Midnight",
  "Royal",
  "Golden",
  "Wild",
  "Swift",
  "Iron",
  "Crimson",
  "Shadow",
  "Lucky",
  "Northern",
  "Whispering",
  "Velvet",
  "Stormy",
  "Brave",
  "Noble",
  "Mystic",
  "Blazing",
  "Quiet",
  "Diamond",
  "Emerald",
  "Roaring",
];

const NOUNS = [
  "Bullet",
  "Star",
  "Spirit",
  "Comet",
  "Dancer",
  "Arrow",
  "Knight",
  "Whisper",
  "Flame",
  "Tide",
  "Empress",
  "Legacy",
  "Dream",
  "Charger",
  "Echo",
  "Bandit",
  "Saint",
  "Reverie",
  "Tempest",
  "Mirage",
  "Halo",
  "Voyager",
  "Sonnet",
];

export function randomHorseName(rng: () => number = Math.random): string {
  const a = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(rng() * NOUNS.length)];
  return `${a} ${n}`;
}

/**
 * Generate random silk color
 */
const SILKS = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#ca8a04",
  "#475569",
  "#0d9488",
];

export function randomSilk(rng: () => number = Math.random): string {
  return SILKS[Math.floor(rng() * SILKS.length)];
}

/**
 * Generate random race name
 */
const RACE_PREFIXES = [
  "Ascot",
  "Belmont",
  "Churchill",
  "Doncaster",
  "Epsom",
  "Flemington",
  "Goodwood",
  "Hialeah",
  "Irish",
  "Kentucky",
  "Longchamp",
  "Newmarket",
  "Oaklawn",
  "Pimlico",
  "Saratoga",
  "Tokyo",
];

const RACE_SUFFIXES = ["Cup", "Stakes", "Trophy", "Classic", "Handicap", "Plate", "Mile", "Sprint"];

export function randomRaceName(rng: () => number = Math.random): string {
  const a = RACE_PREFIXES[Math.floor(rng() * RACE_PREFIXES.length)];
  const b = RACE_SUFFIXES[Math.floor(rng() * RACE_SUFFIXES.length)];
  return `${a} ${b}`;
}
