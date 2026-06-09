/**
 * raceGeneration/australia.ts - Australian race generator
 *
 * Focus: Turf-centric, sprint-heavy, frequent handicaps.
 */

import type { Race, RaceClass } from "../types";
import type { Track } from "@/data/tracks";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { randomWeather, rand } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/race/trackConditions";
import { generateRaceName } from "@/core/race/naming/raceNameGenerator";
import { CLASS_CONFIG } from "./raceGen";

const AUSTRALIA_RACE_DISTRIBUTION: { class: RaceClass; probability: number }[] = [
  { class: "Maiden", probability: 0.3 },
  { class: "Handicap", probability: 0.5 },
  { class: "Allowance", probability: 0.1 },
  { class: "Stakes", probability: 0.1 },
];

/**
 * Select a race class based on Australian race distribution
 * @param rng - Random number generator
 * @returns Selected race class
 */
function selectAustraliaRaceClass(rng: Rng): RaceClass {
  const r = rng.next();
  let cumulative = 0;
  for (const item of AUSTRALIA_RACE_DISTRIBUTION) {
    cumulative += item.probability;
    if (r < cumulative) return item.class;
  }
  return "Handicap";
}

/**
 * Generate a single Australian race
 * @param track - Track to generate race for
 * @param day - Current game day
 * @param rng - Random number generator
 * @param surface - Optional surface type (Turf, Dirt, or Synthetic)
 * @param usedNames - Set of already used race names
 * @returns Generated race object
 */
export function generateAustralianRace(
  track: Track,
  day: number,
  rng: Rng,
  surface?: "Turf" | "Dirt" | "Synthetic",
  usedNames?: Set<string>,
): Race {
  const raceClass = selectAustraliaRaceClass(rng);
  const cfg = CLASS_CONFIG[raceClass];

  const trackSurfaces = track.courses.map((c) => c.surface) as ("Turf" | "Dirt" | "Synthetic")[];
  const selectedSurface = surface || rng.pick(trackSurfaces.length > 0 ? trackSurfaces : ["Turf"]);

  // Australia favors sprints (1000m-1400m)
  const isSprint = rng.next() < 0.6;
  const distance = isSprint
    ? rand(10, 14, rng) * 100
    : rand(cfg.dist[0] / 100, cfg.dist[1] / 100, rng) * 100;

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
    purse: Math.round(cfg.purse * 1.1),
    minStat: cfg.minStat,
    fieldSize: rand(10, 16, rng), // Large fields in Australia
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
 * Generate a full Australian race card (multiple races)
 * @param track - Track to generate races for
 * @param day - Current game day
 * @param numRaces - Number of races to generate
 * @param rng - Random number generator
 * @returns Array of generated races
 */
export function generateAustralianRaceCard(
  track: Track,
  day: number,
  numRaces: number,
  rng: Rng,
): Race[] {
  const races: Race[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < numRaces; i++) {
    races.push(generateAustralianRace(track, day, rng, undefined, usedNames));
  }
  return races;
}
