/**
 * raceGeneration/europe.ts - European race generator
 *
 * Focus: Turf-heavy, longer distances, no claiming, high frequency of handicaps and conditions.
 */

import type { Race, RaceClass } from "../types";
import type { Track } from "@/data/tracks";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { randomWeather, rand } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/race/trackConditions";
import { generateRaceName } from "@/core/race/naming/raceNameGenerator";
import { CLASS_CONFIG } from "./raceGen";

const EUROPE_RACE_DISTRIBUTION: { class: RaceClass; probability: number }[] = [
  { class: "Maiden", probability: 0.25 },
  { class: "Allowance", probability: 0.35 }, // Conditions races
  { class: "Handicap", probability: 0.3 },
  { class: "Listed", probability: 0.05 },
  { class: "Stakes", probability: 0.05 },
];

/**
 * Select a race class based on European race distribution
 * @param rng - Random number generator
 * @returns Selected race class
 */
function selectEuropeRaceClass(rng: Rng): RaceClass {
  const r = rng.next();
  let cumulative = 0;
  for (const item of EUROPE_RACE_DISTRIBUTION) {
    cumulative += item.probability;
    if (r < cumulative) return item.class;
  }
  return "Allowance";
}

/**
 * Generate a single European race
 * @param track - Track to generate race for
 * @param day - Current game day
 * @param rng - Random number generator
 * @param surface - Optional surface type (Turf, Dirt, or Synthetic)
 * @param usedNames - Set of already used race names
 * @returns Generated race object
 */
export function generateEuropeanRace(
  track: Track,
  day: number,
  rng: Rng,
  surface?: "Turf" | "Dirt" | "Synthetic",
  usedNames?: Set<string>,
): Race {
  const raceClass = selectEuropeRaceClass(rng);
  const cfg = CLASS_CONFIG[raceClass];

  // European tracks are overwhelmingly Turf
  const selectedSurface = surface || "Turf";

  // Europe favors longer distances
  const distance = rand(Math.max(cfg.dist[0], 1600) / 100, cfg.dist[1] / 100, rng) * 100;

  const name = generateRaceName({
    track,
    raceClass,
    usedNames,
    surface: selectedSurface,
    distance,
    rng,
  });

  return {
    id: generateUUID(rng),
    name,
    day,
    distance,
    raceClass,
    entryFee: cfg.entry,
    purse: Math.round(cfg.purse * 1.2), // European purses for conditions/handicaps slightly higher
    minStat: cfg.minStat,
    fieldSize: rand(8, 14, rng), // Larger fields in Europe
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "cool", "turf"),
    trackId: track.id,
    surface: selectedSurface,
    isHandicap: raceClass === "Handicap",
  };
}

/**
 * Generate a full European race card (multiple races)
 * @param track - Track to generate races for
 * @param day - Current game day
 * @param numRaces - Number of races to generate
 * @param rng - Random number generator
 * @returns Array of generated races
 */
export function generateEuropeanRaceCard(
  track: Track,
  day: number,
  numRaces: number,
  rng: Rng,
): Race[] {
  const races: Race[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < numRaces; i++) {
    races.push(generateEuropeanRace(track, day, rng, "Turf", usedNames));
  }
  return races;
}
