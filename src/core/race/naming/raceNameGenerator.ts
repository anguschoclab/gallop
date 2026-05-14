/**
 * raceNameGenerator.ts - Race name generation
 *
 * This file generates realistic, unique race names for non-graded races
 * across all regions, inspired by real-world naming conventions.
 *
 * Dependencies: @/game/types (RaceClass, ClaimingPrice, WinCondition, RegionalSystem), @/game/tracks (Track), @/game/rng (Rng), ./namePools (getRandomSponsor, getRandomLocation, getRandomEvent, getRandomAdjective)
 * Related files: Used throughout race generation systems
 */

// Race Name Generator
// Generates realistic, unique race names for non-graded races across all regions
// Inspired by real-world naming conventions

import type { RaceClass, ClaimingPrice, WinCondition, RegionalSystem } from "@/game/types";
import type { Track } from "@/game/tracks";
import type { Rng } from "@/game/rng";
import {
  getRandomSponsor,
  getRandomLocation,
  getRandomEvent,
  getRandomAdjective,
} from "./namePools";

// Generator parameters
export interface RaceNameParams {
  track: Track;
  raceClass: RaceClass;
  claimingPrice?: ClaimingPrice;
  winCondition?: WinCondition;
  usedNames?: Set<string>;
  surface?: "Turf" | "Dirt" | "Synthetic";
  distance?: number;
  rng?: Rng;
}

/**
 * Format claiming price for display.
 *
 * @param price - The claiming price
 * @returns Formatted price string
 *
 * @example
 * const formatted = formatClaimingPrice(10000);
 * // Returns "$10,000"
 */
export function formatClaimingPrice(price: ClaimingPrice): string {
  return `$${price.toLocaleString()}`;
}

/**
 * Format win condition for display.
 *
 * @param condition - The win condition
 * @returns Formatted condition string
 *
 * @example
 * const formatted = formatWinCondition("N1X");
 * // Returns "N1X"
 */
export function formatWinCondition(condition: WinCondition): string {
  const conditionMap: Record<WinCondition, string> = {
    none: "",
    N1X: "N1X",
    N2X: "N2X",
    N3L: "N3L",
    NW1: "NW1",
    NW2: "NW2",
    NW3: "NW3",
  };
  return conditionMap[condition] || "";
}

/**
 * Generate race class abbreviation.
 *
 * Returns a shortened form of the race class for display purposes.
 *
 * @param raceClass - The race class
 * @returns Abbreviated class string
 *
 * @example
 * const abbr = getRaceClassAbbreviation("Maiden");
 * // Returns "Mdn"
 */
export function getRaceClassAbbreviation(raceClass: RaceClass): string {
  const abbreviations: Record<RaceClass, string> = {
    Maiden: "Mdn",
    MaidenSpecialWeight: "MSW",
    MaidenClaiming: "MCL",
    MaidenOptionalClaiming: "MOC",
    MaidenStakes: "MST",
    Allowance: "Alw",
    OptionalClaiming: "OCL",
    StarterAllowance: "STR",
    StarterHandicap: "SHP",
    Stakes: "Stk",
    Claiming: "Clm",
    Handicap: "Hcp",
    Listed: "Lst",
    Group: "Grp",
    Graded: "Grd",
  };
  return abbreviations[raceClass] || raceClass;
}

// Naming pattern types
type NamingPattern =
  | "price_based" // $10,000 Claiming
  | "condition_based" // N1X Allowance
  | "sponsor_type" // Churchill Stakes
  | "location_type" // Blue Grass Stakes
  | "class_location" // Class 2 Handicap
  | "traditional" // Gran Premio [Name]
  | "adjective_type" // Golden Stakes
  | "track_type" // Woodbine Maiden Claiming
  | "simple_type" // Maiden Claiming
  | "legacy"; // Churchill Cup

/**
 * Determine regional system from track or country name.
 *
 * Maps a track's country or a direct country name to its regional naming system
 * (north_america, europe, asia, south_america, australia).
 *
 * @param trackOrCountry - The track object or country name string
 * @returns Regional system identifier
 *
 * @example
 * const region = getRegionalSystem(track);
 * const region2 = getRegionalSystem("Japan");
 */
export function getRegionalSystem(trackOrCountry: Track | string): RegionalSystem {
  const country = typeof trackOrCountry === "string" ? trackOrCountry : trackOrCountry.country;

  // Map country to regional system
  const countryToRegion: Record<string, RegionalSystem> = {
    Canada: "north_america",
    USA: "north_america",
    UAE: "asia",
    Argentina: "south_america",
    Brazil: "south_america",
    Chile: "south_america",
    Sweden: "europe",
    Norway: "europe",
    Denmark: "europe",
    Japan: "asia",
    Italy: "europe",
    "Hong Kong": "asia",
    "Great Britain": "europe",
    France: "europe",
    Ireland: "europe",
    Germany: "europe",
    Turkey: "asia",
    Austria: "europe",
    Belgium: "europe",
    "Czech Republic": "europe",
    Hungary: "europe",
    Spain: "europe",
    Australia: "australia",
    "New Zealand": "australia",
    Singapore: "asia",
    "Saudi Arabia": "asia",
  };

  return countryToRegion[country] || "north_america";
}

// Select naming pattern based on race class and region
function selectNamingPattern(
  raceClass: RaceClass,
  region: RegionalSystem,
  rng: Rng | undefined,
  hasWinCondition: boolean,
  hasClaimingPrice: boolean,
): NamingPattern {
  const r = rng ? rng.next() : Math.random();

  // North America: heavy use of price-based for claiming
  if (region === "north_america") {
    if (
      raceClass === "Claiming" ||
      raceClass === "MaidenClaiming" ||
      raceClass === "MaidenOptionalClaiming"
    ) {
      return "price_based";
    }
    if (raceClass === "OptionalClaiming") {
      // Always use price-based when claiming price is provided
      if (hasClaimingPrice) {
        return "price_based";
      }
      return r < 0.5 ? "price_based" : "sponsor_type";
    }
    if (raceClass === "Allowance" || raceClass === "StarterAllowance") {
      // Prefer condition-based when win condition is provided
      if (hasWinCondition) {
        return "condition_based";
      }
      return r < 0.4 ? "condition_based" : r < 0.7 ? "sponsor_type" : "location_type";
    }
    if (raceClass === "Handicap" || raceClass === "StarterHandicap") {
      return r < 0.5 ? "location_type" : "sponsor_type";
    }
    if (raceClass === "Maiden" || raceClass === "MaidenSpecialWeight") {
      return r < 0.3 ? "track_type" : r < 0.6 ? "location_type" : "sponsor_type";
    }
    return r < 0.4 ? "sponsor_type" : r < 0.7 ? "location_type" : "adjective_type";
  }

  // Europe: use class designations and location names
  if (region === "europe") {
    if (raceClass === "Claiming" || raceClass === "MaidenClaiming") {
      return "price_based";
    }
    if (raceClass === "Maiden" || raceClass === "Handicap") {
      return r < 0.5 ? "location_type" : "simple_type";
    }
    return r < 0.4 ? "location_type" : r < 0.7 ? "sponsor_type" : "class_location";
  }

  // Australia: class-based system
  if (region === "australia") {
    if (raceClass === "Maiden") {
      return r < 0.5 ? "location_type" : "simple_type";
    }
    return r < 0.4 ? "class_location" : r < 0.7 ? "location_type" : "sponsor_type";
  }

  // South America: traditional naming
  if (region === "south_america") {
    if (raceClass === "Claiming") {
      return "price_based";
    }
    return r < 0.3 ? "traditional" : r < 0.6 ? "location_type" : "simple_type";
  }

  // Asia: sponsor-heavy
  if (region === "asia") {
    return r < 0.5 ? "sponsor_type" : r < 0.7 ? "location_type" : "adjective_type";
  }

  // Default
  if (r < 0.2) return "legacy";
  return "sponsor_type";
}

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
  "Aintree",
  "Chepstow",
  "Haydock",
  "Kempton",
  "Ludlow",
  "Sandown",
  "Wincanton",
  "York",
];

const RACE_SUFFIXES = [
  "Cup",
  "Stakes",
  "Trophy",
  "Classic",
  "Handicap",
  "Plate",
  "Mile",
  "Sprint",
  "Championship",
  "Memorial",
  "Invitational",
];

/**
 * Type for pattern generator function.
 */
type PatternGenerator = (params: RaceNameParams, region: RegionalSystem) => string;

/**
 * Strategy record for race name generation based on naming pattern.
 */
const PATTERN_GENERATORS: Record<NamingPattern, PatternGenerator> = {
  price_based: (params, region) => {
    const { claimingPrice, raceClass, rng } = params;
    if (!claimingPrice) {
      // Fallback if no claiming price
      return PATTERN_GENERATORS.simple_type(params, region);
    }
    const priceStr = formatClaimingPrice(claimingPrice);
    if (raceClass === "MaidenClaiming") {
      return `${priceStr} Maiden Claiming`;
    }
    if (raceClass === "MaidenOptionalClaiming") {
      return `${priceStr} Maiden Optional Claiming`;
    }
    if (raceClass === "OptionalClaiming") {
      return `${priceStr} Optional Claiming`;
    }
    return `${priceStr} Claiming`;
  },

  condition_based: (params, region) => {
    const { winCondition, rng } = params;
    const conditionStr = formatWinCondition(winCondition || "none");
    if (conditionStr) {
      return `${conditionStr} Allowance`;
    }
    return `${getRandomSponsor(region, rng)} Allowance`;
  },

  sponsor_type: (params, region) => {
    const { rng } = params;
    const sponsor = getRandomSponsor(region, rng);
    const eventType = getRandomEvent(region, rng);
    return `${sponsor} ${eventType}`;
  },

  location_type: (params, region) => {
    const { rng } = params;
    const location = getRandomLocation(region, rng);
    const event = getRandomEvent(region, rng);
    return `${location} ${event}`;
  },

  class_location: (params, region) => {
    const { raceClass, rng } = params;
    // For European/Australian class-based naming
    const classNum = Math.floor((rng ? rng.next() : Math.random()) * 6) + 1; // Class 1-6
    const loc = getRandomLocation(region, rng);
    if (raceClass === "Handicap") {
      return `Class ${classNum} ${loc} Handicap`;
    }
    return `Class ${classNum} ${loc}`;
  },

  traditional: (params, region) => {
    const { raceClass, rng } = params;
    // South American traditional naming
    const adj = getRandomAdjective(region, rng);
    const tradEvent = getRandomEvent(region, rng);
    if (raceClass === "Stakes" || raceClass === "Listed") {
      return `Gran Premio ${adj} ${tradEvent}`;
    }
    return `${adj} ${tradEvent}`;
  },

  adjective_type: (params, region) => {
    const { rng } = params;
    const adjective = getRandomAdjective(region, rng);
    const evt = getRandomEvent(region, rng);
    return `${adjective} ${evt}`;
  },

  track_type: (params, region) => {
    const { track, raceClass } = params;
    return `${track.name} ${raceClass}`;
  },

  simple_type: (params, region) => {
    const { raceClass } = params;
    return raceClass;
  },

  legacy: (params, region) => {
    const { rng } = params;
    const a = rng ? rng.pick(RACE_PREFIXES) : RACE_PREFIXES[0];
    const b = rng ? rng.pick(RACE_SUFFIXES) : RACE_SUFFIXES[0];
    return `${a} ${b}`;
  },
};

// Generate name based on pattern
function generateNameByPattern(
  pattern: NamingPattern,
  params: RaceNameParams,
  region: RegionalSystem,
): string {
  const generator = PATTERN_GENERATORS[pattern];
  return generator(params, region);
}

// Ensure uniqueness by adding numeric suffix if needed
function ensureUnique(name: string, usedNames: Set<string>): string {
  if (!usedNames.has(name)) {
    return name;
  }

  // Try adding numeric suffix
  let counter = 2;
  while (usedNames.has(`${name} ${counter}`)) {
    counter++;
  }
  return `${name} ${counter}`;
}

/**
 * Main race name generator.
 *
 * Generates a unique, realistic race name based on track, race class,
 * regional naming conventions, and optional parameters like claiming price
 * and win conditions.
 *
 * @param params - Race name generation parameters
 * @returns Generated race name
 *
 * @example
 * const name = generateRaceName({ track, raceClass: "Allowance", rng });
 */
export function generateRaceName(params: RaceNameParams): string {
  const { track, usedNames = new Set<string>(), rng } = params;

  // Determine regional system
  const region = getRegionalSystem(track);

  // Check if win condition is provided
  const hasWinCondition = params.winCondition !== undefined && params.winCondition !== "none";

  // Check if claiming price is provided
  const hasClaimingPrice = params.claimingPrice !== undefined && params.claimingPrice > 0;

  // Select naming pattern
  const pattern = selectNamingPattern(
    params.raceClass,
    region,
    rng,
    hasWinCondition,
    hasClaimingPrice,
  );

  // Generate initial name
  let name = generateNameByPattern(pattern, params, region);

  // Ensure uniqueness
  name = ensureUnique(name, usedNames);

  // Add to used names
  usedNames.add(name);

  return name;
}

/**
 * Generate multiple unique race names for a race card.
 *
 * Generates unique race names for a list of race classes, ensuring no
 * duplicates within the same race card.
 *
 * @param track - The track hosting the races
 * @param raceClasses - List of race classes to generate names for
 * @param additionalParams - Additional generation parameters
 * @returns Array of unique race names
 *
 * @example
 * const names = generateRaceCardNames(track, ["Maiden", "Allowance", "Stakes"]);
 */
export function generateRaceCardNames(
  track: Track,
  raceClasses: RaceClass[],
  additionalParams: Omit<RaceNameParams, "raceClass" | "track"> = {},
): string[] {
  const usedNames = new Set<string>();
  const names: string[] = [];

  for (const raceClass of raceClasses) {
    const name = generateRaceName({
      ...additionalParams,
      track,
      raceClass,
      usedNames,
    });
    names.push(name);
  }

  return names;
}
