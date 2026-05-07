import type { Rng } from "@/game/rng";

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
];

const RACE_SUFFIXES = ["Cup", "Stakes", "Trophy", "Classic", "Handicap", "Plate", "Mile", "Sprint"];

/**
 * Generate random race name using legacy prefix-suffix lists
 */
export function randomRaceName(rng: Rng): string {
  const a = rng.pick(RACE_PREFIXES);
  const b = rng.pick(RACE_SUFFIXES);
  return `${a} ${b}`;
}
