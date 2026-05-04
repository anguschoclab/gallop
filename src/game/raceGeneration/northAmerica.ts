// North American Race Generator
// Generates races with NA-specific patterns: 70% claiming races, optional claiming, starter races
// Graded races can be handicaps in NA

import type { Race, RaceClass, ClaimingPrice } from "../types";
import type { Track } from "../tracks";
import { generateUUID } from "../uuid";
import { randomWeather, randomTrackCondition, rand } from "@/core/common/random";
import { generateRaceName } from "@/core/race/naming/raceNameGenerator";

// Configuration for North American race distribution
// 70% claiming races as per real-world statistics
const NA_RACE_DISTRIBUTION: { class: RaceClass; probability: number }[] = [
  { class: "MaidenClaiming", probability: 0.15 },
  { class: "Claiming", probability: 0.25 },
  { class: "OptionalClaiming", probability: 0.15 },
  { class: "Maiden", probability: 0.08 },
  { class: "MaidenSpecialWeight", probability: 0.05 },
  { class: "Allowance", probability: 0.10 },
  { class: "StarterAllowance", probability: 0.08 },
  { class: "StarterHandicap", probability: 0.05 },
  { class: "Stakes", probability: 0.05 },
  { class: "Handicap", probability: 0.04 },
  { class: "MaidenStakes", probability: 0.02 },
  { class: "MaidenOptionalClaiming", probability: 0.02 },
  { class: "Listed", probability: 0.01 },
  { class: "Group", probability: 0.00 }, // Group races are pre-defined in gradedRaces.ts
];

// Claiming price tiers for North America
const NA_CLAIMING_PRICES: ClaimingPrice[] = [
  5000, 10000, 12500, 16000, 20000, 25000, 32000, 40000, 50000, 62500, 75000, 100000,
];

// Configuration for each race class
const NA_CLASS_CONFIG: Record<
  RaceClass,
  { entry: number; purse: number; minStat?: number; dist: [number, number] }
> = {
  Maiden: { entry: 100, purse: 2000, dist: [1000, 1400] },
  MaidenSpecialWeight: { entry: 150, purse: 3000, minStat: 40, dist: [1000, 1600] },
  MaidenClaiming: { entry: 100, purse: 2000, dist: [1000, 1400] },
  MaidenOptionalClaiming: { entry: 120, purse: 2500, minStat: 35, dist: [1000, 1400] },
  MaidenStakes: { entry: 500, purse: 10000, minStat: 45, dist: [1200, 1800] },
  Allowance: { entry: 300, purse: 6000, minStat: 50, dist: [1200, 1800] },
  OptionalClaiming: { entry: 350, purse: 7000, minStat: 52, dist: [1200, 1800] },
  StarterAllowance: { entry: 250, purse: 5000, minStat: 48, dist: [1200, 1800] },
  StarterHandicap: { entry: 200, purse: 4500, minStat: 45, dist: [1200, 2000] },
  Stakes: { entry: 800, purse: 18000, minStat: 65, dist: [1400, 2200] },
  Claiming: { entry: 150, purse: 3000, minStat: 40, dist: [1000, 1800] },
  Handicap: { entry: 400, purse: 8000, minStat: 55, dist: [1200, 2400] },
  Listed: { entry: 1500, purse: 40000, minStat: 72, dist: [1400, 2400] },
  Group: { entry: 2000, purse: 50000, minStat: 78, dist: [1600, 2400] },
  Graded: { entry: 0, purse: 0, dist: [1200, 2400] },
};

// Select a race class based on NA distribution
function selectNARaceClass(): RaceClass {
  const r = Math.random();
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
function selectClaimingPrice(trackQuality: "low" | "mid" | "high"): ClaimingPrice {
  const priceRanges: Record<typeof trackQuality, ClaimingPrice[]> = {
    low: [5000, 10000, 12500, 16000],
    mid: [10000, 12500, 16000, 20000, 25000, 32000],
    high: [25000, 32000, 40000, 50000, 62500, 75000, 100000],
  };
  const prices = priceRanges[trackQuality];
  return prices[Math.floor(Math.random() * prices.length)];
}

// Determine track quality based on country (simplified for now)
function getTrackQuality(country: string): "low" | "mid" | "high" {
  const highQualityTracks = ["Canada", "USA"];
  const midQualityTracks = ["Argentina", "Brazil", "Chile"];
  
  if (highQualityTracks.some(c => country.includes(c))) return "high";
  if (midQualityTracks.some(c => country.includes(c))) return "mid";
  return "low";
}

// Generate a single North American race
export function generateNorthAmericanRace(
  track: Track,
  day: number,
  surface?: "Turf" | "Dirt" | "Synthetic",
  usedNames?: Set<string>
): Race {
  const raceClass = selectNARaceClass();
  const cfg = NA_CLASS_CONFIG[raceClass];
  const trackQuality = getTrackQuality(track.country);
  
  // Select surface if not specified
  const selectedSurface = surface || track.surfaces[Math.floor(Math.random() * track.surfaces.length)];
  
  // Calculate distance
  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100) * 100;
  
  // Determine claiming price for claiming races (needed for naming)
  let claimingPrice: ClaimingPrice | undefined;
  if (raceClass === "Claiming" || raceClass === "MaidenClaiming" || raceClass === "MaidenOptionalClaiming") {
    claimingPrice = selectClaimingPrice(trackQuality);
  }
  
  // Determine claiming price for optional claiming (optional, needed for naming)
  if (raceClass === "OptionalClaiming") {
    claimingPrice = selectClaimingPrice(trackQuality);
  }
  
  // Determine win condition for allowance races (needed for naming)
  let winCondition: "N1X" | "N2X" | "N3L" | "none" | undefined;
  if (raceClass === "Allowance" || raceClass === "StarterAllowance") {
    const winConditions: ("N1X" | "N2X" | "N3L" | "none")[] = ["N1X", "N2X", "N3L", "none"];
    winCondition = winConditions[Math.floor(Math.random() * winConditions.length)];
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
  });
  
  // Build race object
  const race: Race = {
    id: generateUUID(),
    name,
    day,
    distance,
    raceClass,
    entryFee: cfg.entry,
    purse: cfg.purse,
    minStat: cfg.minStat,
    fieldSize: rand(6, 10),
    entries: [],
    resolved: false,
    weather: randomWeather(),
    trackCondition: randomTrackCondition(),
    trackId: track.id,
    surface: selectedSurface,
  };
  
  // Add claiming price for claiming races
  if (raceClass === "Claiming" || raceClass === "MaidenClaiming" || raceClass === "MaidenOptionalClaiming") {
    race.claimingPrice = claimingPrice;
    // Scale purse based on claiming price
    if (claimingPrice) {
      race.purse = claimingPrice * 2 + Math.floor(Math.random() * 5000);
    }
  }
  
  // Add claiming price for optional claiming (optional)
  if (raceClass === "OptionalClaiming") {
    race.claimingPrice = claimingPrice;
    if (claimingPrice) {
      race.purse = claimingPrice * 2.5 + Math.floor(Math.random() * 5000);
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

// Generate multiple races for a track on a given day
export function generateNorthAmericanRaceCard(
  track: Track,
  day: number,
  numRaces: number
): Race[] {
  const races: Race[] = [];
  const usedNames = new Set<string>();
  
  for (let i = 0; i < numRaces; i++) {
    // Alternate surfaces if track has multiple
    const surfaceIndex = i % track.surfaces.length;
    const surface = track.surfaces[surfaceIndex];
    
    const race = generateNorthAmericanRace(track, day, surface, usedNames);
    races.push(race);
  }
  
  return races;
}
