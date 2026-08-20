/**
 * raceNameUtils.ts - Utility functions and types for race name generation
 *
 * Extracted from raceNameGenerator.ts for modularity.
 */

import type { RaceClass, ClaimingPrice, WinCondition, RegionalSystem } from "@/game/types";
import type { Track } from "@/data/tracks";

export interface RaceNameParams {
  track: Track;
  raceClass: RaceClass;
  claimingPrice?: ClaimingPrice;
  winCondition?: WinCondition;
  usedNames?: Set<string>;
  surface?: "Turf" | "Dirt" | "Synthetic";
  distance?: number;
  rng?: import("@/core/common/rng").Rng;
}

export function formatClaimingPrice(price: ClaimingPrice): string {
  return `$${price.toLocaleString()}`;
}

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

export function getRegionalSystem(trackOrCountry: Track | string): RegionalSystem {
  const country = typeof trackOrCountry === "string" ? trackOrCountry : trackOrCountry.country;

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
