/**
 * raceNamePatterns.ts - Naming pattern selection and generation strategies
 *
 * Extracted from raceNameGenerator.ts for modularity.
 */

import type { RaceClass, RegionalSystem } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import { nondeterministicRng } from "@/core/common/rng";
import {
  getRandomSponsor,
  getRandomLocation,
  getRandomEvent,
  getRandomAdjective,
} from "./namePools";
import { formatClaimingPrice, formatWinCondition, type RaceNameParams } from "./raceNameUtils";

export type NamingPattern =
  | "price_based"
  | "condition_based"
  | "sponsor_type"
  | "location_type"
  | "class_location"
  | "traditional"
  | "adjective_type"
  | "track_type"
  | "simple_type"
  | "legacy";

export function selectNamingPattern(
  raceClass: RaceClass,
  region: RegionalSystem,
  rng: Rng | undefined,
  hasWinCondition: boolean,
  hasClaimingPrice: boolean,
): NamingPattern {
  const r = rng ? rng.next() : nondeterministicRng().next();

  if (region === "north_america") {
    if (
      raceClass === "Claiming" ||
      raceClass === "MaidenClaiming" ||
      raceClass === "MaidenOptionalClaiming"
    ) {
      return "price_based";
    }
    if (raceClass === "OptionalClaiming") {
      if (hasClaimingPrice) {
        return "price_based";
      }
      return r < 0.5 ? "price_based" : "sponsor_type";
    }
    if (raceClass === "Allowance" || raceClass === "StarterAllowance") {
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

  if (region === "europe") {
    if (raceClass === "Claiming" || raceClass === "MaidenClaiming") {
      return "price_based";
    }
    if (raceClass === "Maiden" || raceClass === "Handicap") {
      return r < 0.5 ? "location_type" : "simple_type";
    }
    return r < 0.4 ? "location_type" : r < 0.7 ? "sponsor_type" : "class_location";
  }

  if (region === "australia") {
    if (raceClass === "Maiden") {
      return r < 0.5 ? "location_type" : "simple_type";
    }
    return r < 0.4 ? "class_location" : r < 0.7 ? "location_type" : "sponsor_type";
  }

  if (region === "south_america") {
    if (raceClass === "Claiming") {
      return "price_based";
    }
    return r < 0.3 ? "traditional" : r < 0.6 ? "location_type" : "simple_type";
  }

  if (region === "asia") {
    return r < 0.5 ? "sponsor_type" : r < 0.7 ? "location_type" : "adjective_type";
  }

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

type PatternGenerator = (params: RaceNameParams, region: RegionalSystem) => string;

export const PATTERN_GENERATORS: Record<NamingPattern, PatternGenerator> = {
  price_based: (params, region) => {
    const { claimingPrice, raceClass, rng } = params;
    if (!claimingPrice) {
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
    const classNum = Math.floor((rng ? rng.next() : nondeterministicRng().next()) * 6) + 1;
    const loc = getRandomLocation(region, rng);
    if (raceClass === "Handicap") {
      return `Class ${classNum} ${loc} Handicap`;
    }
    return `Class ${classNum} ${loc}`;
  },

  traditional: (params, region) => {
    const { raceClass, rng } = params;
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

export function generateNameByPattern(
  pattern: NamingPattern,
  params: RaceNameParams,
  region: RegionalSystem,
): string {
  const generator = PATTERN_GENERATORS[pattern];
  return generator(params, region);
}

export function ensureUnique(name: string, usedNames: Set<string>): string {
  if (!usedNames.has(name)) {
    return name;
  }

  let counter = 2;
  while (usedNames.has(`${name} ${counter}`)) {
    counter++;
  }
  return `${name} ${counter}`;
}
