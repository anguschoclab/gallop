/**
 * raceGeneration/asia.ts - Asian race generator (Japan, HK, UAE)
 *
 * Focus: High class, no claiming, mixed distances, high purses.
 */

import type { Race, RaceClass } from "../types";
import type { Track } from "@/data/tracks";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { randomWeather, rand } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/race/trackConditions";
import { generateRaceName } from "@/core/race/naming/raceNameGenerator";
import { CLASS_CONFIG } from "./raceGen";
import {
  ASIA_ENTRY_FEE_MULTIPLIER,
  ASIA_PURSE_MULTIPLIER,
  ASIA_MINSTAT_BONUS,
  ASIA_FIELD_SIZE_MIN,
  ASIA_FIELD_SIZE_MAX,
} from "@/constants";

const ASIA_RACE_DISTRIBUTION: { class: RaceClass; probability: number }[] = [
  { class: "Maiden", probability: 0.15 },
  { class: "Allowance", probability: 0.4 },
  { class: "Listed", probability: 0.2 },
  { class: "Stakes", probability: 0.2 },
  { class: "Handicap", probability: 0.05 },
];

/**
 * Select a race class based on Asian race distribution
 * @param rng - Random number generator
 * @returns Selected race class
 */
function selectAsiaRaceClass(rng: Rng): RaceClass {
  const r = rng.next();
  let cumulative = 0;
  for (const item of ASIA_RACE_DISTRIBUTION) {
    cumulative += item.probability;
    if (r < cumulative) return item.class;
  }
  return "Allowance";
}

/**
 * Generate a single Asian race
 * @param track - Track to generate race for
 * @param day - Current game day
 * @param rng - Random number generator
 * @param surface - Optional surface type (Turf, Dirt, or Synthetic)
 * @param usedNames - Set of already used race names
 * @returns Generated race object
 */
export function generateAsianRace(
  track: Track,
  day: number,
  rng: Rng,
  surface?: "Turf" | "Dirt" | "Synthetic",
  usedNames?: Set<string>,
): Race {
  const raceClass = selectAsiaRaceClass(rng);
  const cfg = CLASS_CONFIG[raceClass];

  const trackSurfaces = track.courses.map((c) => c.surface) as ("Turf" | "Dirt" | "Synthetic")[];
  const selectedSurface = surface || rng.pick(trackSurfaces.length > 0 ? trackSurfaces : ["Turf"]);

  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100, rng) * 100;

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
    entryFee: Math.round(cfg.entry * ASIA_ENTRY_FEE_MULTIPLIER),
    purse: Math.round(cfg.purse * ASIA_PURSE_MULTIPLIER), // Asian racing (Japan/HK/UAE) has much higher purses
    minStat: cfg.minStat !== undefined ? cfg.minStat + ASIA_MINSTAT_BONUS : undefined, // Higher standard for classes with minStat; Maiden stays open
    fieldSize: rand(ASIA_FIELD_SIZE_MIN, ASIA_FIELD_SIZE_MAX, rng),
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "turf"),
    trackId: track.id,
    surface: selectedSurface,
    isHandicap: raceClass === "Handicap",
  };
}

/**
 * Generate a full Asian race card (multiple races)
 * @param track - Track to generate races for
 * @param day - Current game day
 * @param numRaces - Number of races to generate
 * @param rng - Random number generator
 * @returns Array of generated races
 */
export function generateAsianRaceCard(
  track: Track,
  day: number,
  numRaces: number,
  rng: Rng,
): Race[] {
  const races: Race[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < numRaces; i++) {
    races.push(generateAsianRace(track, day, rng, undefined, usedNames));
  }
  return races;
}
