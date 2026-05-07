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

// Format claiming price for display
export function formatClaimingPrice(price: ClaimingPrice): string {
  return `$${price.toLocaleString()}`;
}

// Format win condition for display
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

// Generate race class abbreviation
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

// Determine regional system from track
export function getRegionalSystem(track: Track): RegionalSystem {
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
  };

  return countryToRegion[track.country] || "north_america";
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
  "Ascot", "Belmont", "Churchill", "Doncaster", "Epsom", "Flemington", "Goodwood", "Hialeah",
  "Irish", "Kentucky", "Longchamp", "Newmarket", "Oaklawn", "Pimlico", "Saratoga", "Tokyo",
  "Aintree", "Chepstow", "Haydock", "Kempton", "Ludlow", "Sandown", "Wincanton", "York"
];

const RACE_SUFFIXES = ["Cup", "Stakes", "Trophy", "Classic", "Handicap", "Plate", "Mile", "Sprint", "Championship", "Memorial", "Invitational"];

// Generate name based on pattern
function generateNameByPattern(
  pattern: NamingPattern,
  params: RaceNameParams,
  region: RegionalSystem,
): string {
  const { track, raceClass, claimingPrice, winCondition, rng } = params;

  switch (pattern) {
    case "price_based":
      if (!claimingPrice) {
        // Fallback if no claiming price
        return generateNameByPattern("simple_type", params, region);
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

    case "condition_based":
      const conditionStr = formatWinCondition(winCondition || "none");
      if (conditionStr) {
        return `${conditionStr} Allowance`;
      }
      return `${getRandomSponsor(region, rng)} Allowance`;

    case "sponsor_type":
      const sponsor = getRandomSponsor(region, rng);
      const eventType = getRandomEvent(region, rng);
      return `${sponsor} ${eventType}`;

    case "location_type":
      const location = getRandomLocation(region, rng);
      const event = getRandomEvent(region, rng);
      return `${location} ${event}`;

    case "class_location":
      // For European/Australian class-based naming
      const classNum = Math.floor((rng ? rng.next() : Math.random()) * 6) + 1; // Class 1-6
      const loc = getRandomLocation(region, rng);
      if (raceClass === "Handicap") {
        return `Class ${classNum} ${loc} Handicap`;
      }
      return `Class ${classNum} ${loc}`;

    case "traditional":
      // South American traditional naming
      const adj = getRandomAdjective(region, rng);
      const tradEvent = getRandomEvent(region, rng);
      if (raceClass === "Stakes" || raceClass === "Listed") {
        return `Gran Premio ${adj} ${tradEvent}`;
      }
      return `${adj} ${tradEvent}`;

    case "adjective_type":
      const adjective = getRandomAdjective(region, rng);
      const evt = getRandomEvent(region, rng);
      return `${adjective} ${evt}`;

    case "track_type":
      return `${track.name} ${raceClass}`;

    case "simple_type":
      return raceClass;

    case "legacy":
      const a = rng ? rng.pick(RACE_PREFIXES) : RACE_PREFIXES[0];
      const b = rng ? rng.pick(RACE_SUFFIXES) : RACE_SUFFIXES[0];
      return `${a} ${b}`;

    default:
      return `${getRandomSponsor(region, rng)} Stakes`;
  }
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

// Main race name generator
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

// Generate multiple unique race names for a race card
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
