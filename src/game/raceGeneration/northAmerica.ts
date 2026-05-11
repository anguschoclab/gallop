/**
 * raceGeneration/northAmerica.ts - North American race generator
 *
 * This file generates races with NA-specific patterns: 70% claiming races, optional
 * claiming, starter races, with graded races able to be handicaps in NA.
 *
 * Dependencies: ../types (Race, RaceClass, ClaimingPrice), ../tracks (Track), ../rng (Rng), ../uuid (generateUUID), @/core/common/random (randomWeather, rand), @/core/trackConditions (randomTrackConditionWithClimateBias), @/core/race/naming/raceNameGenerator (generateRaceName), ./raceGen (CLASS_CONFIG)
 * Related files: raceGen.ts (base race generation), raceSchedule.ts (uses generated races)
 */

// North American Race Generator
// Generates races with NA-specific patterns: 70% claiming races, optional claiming, starter races
// Graded races can be handicaps in NA

import type { Race, RaceClass, ClaimingPrice } from "../types";
import type { Track } from "../tracks";
import type { Rng } from "@/game/rng";
import { generateUUID } from "@/core/uuid";
import { randomWeather, rand } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/trackConditions";
import { generateRaceName } from "@/core/race/naming/raceNameGenerator";
import { CLASS_CONFIG } from "./raceGen";
import { NA_CLAIMING_RACE_PERCENTAGE } from "@/game/constants/gameConstants";

// Configuration for North American race distribution
// Matches NA_CLAIMING_RACE_PERCENTAGE (70%) as per real-world statistics
const NA_RACE_DISTRIBUTION: { class: RaceClass; probability: number }[] = [
  { class: "MaidenClaiming", probability: 0.15 },
  { class: "Claiming", probability: 0.25 },
  { class: "OptionalClaiming", probability: 0.15 },
  { class: "Maiden", probability: 0.08 },
  { class: "MaidenSpecialWeight", probability: 0.05 },
  { class: "Allowance", probability: 0.1 },
  { class: "StarterAllowance", probability: 0.08 },
  { class: "StarterHandicap", probability: 0.05 },
  { class: "Stakes", probability: 0.05 },
  { class: "Handicap", probability: 0.04 },
  { class: "MaidenStakes", probability: 0.02 },
  { class: "MaidenOptionalClaiming", probability: 0.02 },
  { class: "Listed", probability: 0.01 },
  { class: "Group", probability: 0.0 }, // Group races are pre-defined in gradedRaces.ts
];

// Claiming price tiers for North America
const NA_CLAIMING_PRICES: ClaimingPrice[] = [
  5000, 10000, 12500, 16000, 20000, 25000, 32000, 40000, 50000, 62500, 75000, 100000,
];

// Select a race class based on NA distribution
function selectNARaceClass(rng: Rng): RaceClass {
  const r = rng.next();
  let cumulative = 0;
  for (const item of NA_RACE_DISTRIBUTION) {
    cumulative += item.probability;
    if (r < cumulative) {
      return item.class;
    }
  }
  return "MaidenClaiming"; // Fallback
}

// Select a claiming price based on track quality and random variation
function selectClaimingPrice(trackQuality: "low" | "mid" | "high", rng: Rng): ClaimingPrice {
  const priceRanges: Record<typeof trackQuality, ClaimingPrice[]> = {
    low: [5000, 10000, 12500, 16000],
    mid: [10000, 12500, 16000, 20000, 25000, 32000],
    high: [25000, 32000, 40000, 50000, 62500, 75000, 100000],
  };
  const prices = priceRanges[trackQuality];
  return rng.pick(prices);
}

// Determine track quality based on country (simplified for now)
function getTrackQuality(country: string): "low" | "mid" | "high" {
  const highQualityTracks = ["Canada", "USA"];
  const midQualityTracks = ["Argentina", "Brazil", "Chile"];

  if (highQualityTracks.some((c) => country.includes(c))) return "high";
  if (midQualityTracks.some((c) => country.includes(c))) return "mid";
  return "low";
}

/**
 * Generate a single North American race.
 *
 * Uses NA-specific race distribution (governed by NA_CLAIMING_RACE_PERCENTAGE),
 * selects claiming price based on track quality, and generates appropriate race names.
 *
 * @param track - Track to generate race for
 * @param day - Day the race takes place
 * @param rng - Random number generator
 * @param surface - Optional surface to use
 * @param usedNames - Set of used race names to avoid duplicates
 * @returns Complete race object
 */
export function generateNorthAmericanRace(
  track: Track,
  day: number,
  rng: Rng,
  surface?: "Turf" | "Dirt" | "Synthetic",
  usedNames?: Set<string>,
): Race {
  const raceClass = selectNARaceClass(rng);
  const cfg = CLASS_CONFIG[raceClass];
  const trackQuality = getTrackQuality(track.country);

  // Select surface if not specified
  const trackSurfaces = track.courses.map((c) => c.surface) as ("Turf" | "Dirt" | "Synthetic")[];
  const selectedSurface = surface || rng.pick(trackSurfaces.length > 0 ? trackSurfaces : ["Dirt"]);

  // Calculate distance
  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100, rng) * 100;

  // Determine claiming price for claiming races (needed for naming)
  let claimingPrice: ClaimingPrice | undefined;
  if (
    raceClass === "Claiming" ||
    raceClass === "MaidenClaiming" ||
    raceClass === "MaidenOptionalClaiming"
  ) {
    claimingPrice = selectClaimingPrice(trackQuality, rng);
  }

  // Determine claiming price for optional claiming (optional, needed for naming)
  if (raceClass === "OptionalClaiming") {
    claimingPrice = selectClaimingPrice(trackQuality, rng);
  }

  // Determine win condition for allowance races (needed for naming)
  let winCondition: "N1X" | "N2X" | "N3L" | "none" | undefined;
  if (raceClass === "Allowance" || raceClass === "StarterAllowance") {
    const winConditions: ("N1X" | "N2X" | "N3L" | "none")[] = ["N1X", "N2X", "N3L", "none"];
    winCondition = rng.pick(winConditions);
  }

  // Generate race name using new generator
  const name = generateRaceName({
    track,
    raceClass,
    claimingPrice,
    winCondition,
    usedNames,
    surface: selectedSurface,
    distance,
    rng,
  });

  // Build race object
  const race: Race = {
    id: generateUUID(rng),
    name,
    day,
    distance,
    raceClass,
    entryFee: cfg.entry,
    purse: cfg.purse,
    minStat: cfg.minStat,
    fieldSize: rand(6, 10, rng),
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "turf"),
    trackId: track.id,
    surface: selectedSurface,
  };

  // Add claiming price for claiming races
  if (
    raceClass === "Claiming" ||
    raceClass === "MaidenClaiming" ||
    raceClass === "MaidenOptionalClaiming"
  ) {
    race.claimingPrice = claimingPrice;
    // Scale purse based on claiming price
    if (claimingPrice) {
      race.purse = claimingPrice * 2 + rng.int(0, 5000);
    }
  }

  // Add claiming price for optional claiming (optional)
  if (raceClass === "OptionalClaiming") {
    race.claimingPrice = claimingPrice;
    if (claimingPrice) {
      race.purse = claimingPrice * 2.5 + rng.int(0, 5000);
    }
  }

  // Add handicap flag
  if (raceClass === "Handicap" || raceClass === "StarterHandicap") {
    race.isHandicap = true;
  }

  // Add win condition for allowance races
  if (winCondition) {
    race.winCondition = winCondition;
  }

  return race;
}

/**
 * Generate multiple races for a track on a given day.
 *
 * Creates a race card by alternating between available track surfaces.
 *
 * @param track - Track to generate races for
 * @param day - Day the races take place
 * @param numRaces - Number of races to generate
 * @param rng - Random number generator
 * @returns Array of generated races
 */
export function generateNorthAmericanRaceCard(
  track: Track,
  day: number,
  numRaces: number,
  rng: Rng,
): Race[] {
  const races: Race[] = [];
  const usedNames = new Set<string>();

  const trackSurfaces = track.courses.map((c) => c.surface) as ("Turf" | "Dirt" | "Synthetic")[];
  const availableSurfaces = trackSurfaces.length > 0 ? trackSurfaces : ["Dirt" as const];
  for (let i = 0; i < numRaces; i++) {
    // Alternate surfaces if track has multiple
    const surfaceIndex = i % availableSurfaces.length;
    const surface = availableSurfaces[surfaceIndex];

    const race = generateNorthAmericanRace(track, day, rng, surface, usedNames);
    races.push(race);
  }

  return races;
}
