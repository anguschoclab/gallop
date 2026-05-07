import type { Rng } from "@/game/rng";

const RACE_PREFIXES = [
  "Ascot", "Belmont", "Churchill", "Doncaster", "Epsom", "Flemington",
  "Goodwood", "Hialeah", "Irish", "Kentucky", "Longchamp", "Newmarket",
  "Oaklawn", "Pimlico", "Saratoga", "Tokyo",
];

const RACE_SUFFIXES = ["Cup", "Stakes", "Trophy", "Classic", "Handicap", "Plate", "Mile", "Sprint"];

export function randomRaceName(rng: Rng): string {
  return `${rng.pick(RACE_PREFIXES)} ${rng.pick(RACE_SUFFIXES)}`;
}
