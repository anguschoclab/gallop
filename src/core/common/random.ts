/**
 * Pure random utility functions
 * Extracted from: horseGen.ts, npcHorseGen.ts, names.ts
 */

import type { Conformation, Temperament, GeneticMarkers, RunningStyle, CoatColor, Weather, TrackCondition } from "@/game/types";
import type { Rng } from "@/game/rng";

/**
 * Generate random integer in range [min, max] (inclusive)
 */
export function rand(min: number, max: number, rng: Rng): number {
  return rng.int(min, max);
}

/**
 * Generate random conformation quality
 */
export function randConformation(rng: Rng): Conformation {
  const r = rng.next();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

/**
 * Generate random temperament quality
 */
export function randTemperament(rng: Rng): Temperament {
  const r = rng.next();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

/**
 * Generate random genetic quality rating
 */
export function randGeneticQuality(rng: Rng): "excellent" | "good" | "fair" | "poor" {
  const r = rng.next();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

/**
 * Generate genetic markers for a horse
 */
export function generateGeneticMarkers(rng: Rng): GeneticMarkers {
  // Hardy-Weinberg-ish distribution for the leopard-complex spotting allele.
  // ~5% homozygous dominant (high CSNB risk), ~25% heterozygous, rest recessive.
  const lpRoll = rng.next();
  let leopardComplex: GeneticMarkers["leopardComplex"];
  let csnbRisk: GeneticMarkers["csnbRisk"];
  if (lpRoll < 0.05) {
    leopardComplex = "dominant";
    csnbRisk = "high";
  } else if (lpRoll < 0.30) {
    leopardComplex = "heterozygous";
    csnbRisk = "low";
  } else {
    leopardComplex = "recessive";
    csnbRisk = "low";
  }

  // Lethal recessive carrier flags. ~5% carrier rate per condition matches
  // real-world thoroughbred prevalence reasonably. Both parents carrier on
  // the same condition → 25% homozygous foal (auto-stillborn at day-60).
  const lethalCarriers = {
    csnb: rng.next() < 0.05,
    hypp: rng.next() < 0.05,
    olws: rng.next() < 0.05,
  };

  return {
    sensoryPerception: randGeneticQuality(rng),
    signalTransduction: randGeneticQuality(rng),
    immunity: randGeneticQuality(rng),
    geneticDiversity: rng.range(0.5, 1.0), // Random diversity score 0.5-1.0
    leopardComplex,
    csnbRisk,
    lethalCarriers,
  };
}

/**
 * Pick a running style biased by the horse's stat profile. Speed/acceleration
 * tilt toward front-runner; stamina tilts toward closer; balanced horses lean
 * stalker. There's still randomness so identical-stat horses can differ.
 */
export function rollRunningStyle(stats: { speed: number; stamina: number; acceleration: number }, rng: Rng): RunningStyle {
  const earlyBias = (stats.speed + stats.acceleration) / 2;
  const lateBias = stats.stamina;
  const tilt = earlyBias - lateBias; // ~ -50..+50
  const r = rng.next() * 100 - tilt; // tilt shifts the distribution
  if (r < 25) return "E";
  if (r < 55) return "EP";
  if (r < 80) return "P";
  return "S";
}

/**
 * Generate random coat color with Thoroughbred-appropriate frequencies.
 * Bay and chestnut variants are most common; dilute colors (palomino, buckskin) are rare.
 */
export function randomCoatColor(rng: Rng): CoatColor {
  const r = rng.next();
  // Realistic Thoroughbred color distribution
  if (r < 0.30) return "bay";           // ~30% - most common
  if (r < 0.55) return "chestnut";      // ~25% - second most common
  if (r < 0.70) return "dark-bay";      // ~15% - brown variants
  if (r < 0.78) return "seal-brown";    // ~8% - registered as brown
  if (r < 0.85) return "gray";          // ~7% - grays of racing age
  if (r < 0.90) return "black";         // ~5% - true black
  if (r < 0.93) return "liver-chestnut"; // ~3% - dark chestnut
  if (r < 0.95) return "roan";          // ~2% - bay/brown roan
  if (r < 0.96) return "buckskin";      // ~1% - rare in TBs
  if (r < 0.97) return "dun";           // ~1% - very rare in TBs
  if (r < 0.98) return "palomino";      // ~1% - very rare in TBs
  if (r < 0.99) return "champagne";     // ~1% - rare metallic sheen
  if (r < 0.995) return "grulla";       // ~0.5% - extremely rare
  return "white";                       // ~0.5% - maximum white pattern
}

/**
 * Generate random weather condition
 */
export function randomWeather(rng: Rng): Weather {
  const r = rng.next();
  if (r < 0.45) return "sunny";
  if (r < 0.70) return "cloudy";
  if (r < 0.85) return "rainy";
  if (r < 0.95) return "sunset";
  return "night";
}

/**
 * Generate random track condition
 */
export function randomTrackCondition(rng: Rng): TrackCondition {
  const r = rng.next();
  if (r < 0.6) return "fast";
  if (r < 0.85) return "good";
  if (r < 0.95) return "soft";
  return "heavy";
}

/**
 * Generate random horse name
 */
const ADJECTIVES = [
  "Thunder", "Silver", "Midnight", "Royal", "Golden", "Wild", "Swift", "Iron",
  "Crimson", "Shadow", "Lucky", "Northern", "Whispering", "Velvet", "Stormy",
  "Brave", "Noble", "Mystic", "Blazing", "Quiet", "Diamond", "Emerald", "Roaring",
];

const NOUNS = [
  "Bullet", "Star", "Spirit", "Comet", "Dancer", "Arrow", "Knight", "Whisper",
  "Flame", "Tide", "Empress", "Legacy", "Dream", "Charger", "Echo", "Bandit",
  "Saint", "Reverie", "Tempest", "Mirage", "Halo", "Voyager", "Sonnet",
];

export function randomHorseName(rng: Rng): string {
  const a = rng.pick(ADJECTIVES);
  const n = rng.pick(NOUNS);
  return `${a} ${n}`;
}

/**
 * Generate random silk color
 */
const SILKS = [
  "#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c",
  "#0891b2", "#db2777", "#ca8a04", "#475569", "#0d9488",
];

export function randomSilk(rng: Rng): string {
  return rng.pick(SILKS);
}

/**
 * Generate random race name
 */
const RACE_PREFIXES = [
  "Ascot", "Belmont", "Churchill", "Doncaster", "Epsom", "Flemington",
  "Goodwood", "Hialeah", "Irish", "Kentucky", "Longchamp", "Newmarket",
  "Oaklawn", "Pimlico", "Saratoga", "Tokyo",
];

const RACE_SUFFIXES = ["Cup", "Stakes", "Trophy", "Classic", "Handicap", "Plate", "Mile", "Sprint"];

export function randomRaceName(rng: Rng): string {
  const a = rng.pick(RACE_PREFIXES);
  const b = rng.pick(RACE_SUFFIXES);
  return `${a} ${b}`;
}
