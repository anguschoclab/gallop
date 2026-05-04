/**
 * Pure random utility functions
 * Extracted from: horseGen.ts, npcHorseGen.ts, names.ts
 */

import type { RunningStyle, Weather, TrackCondition } from "@/game/types";
import type { Rng } from "@/game/rng";

/**
 * Generate random integer in range [min, max] (inclusive)
 */
export function rand(min: number, max: number, rng: Rng): number {
  return rng.int(min, max);
}

/**
 * Pick a running style biased by the horse's stat profile. Speed/acceleration
 * tilt toward front-runner; stamina tilts toward closer; balanced horses lean
 * stalker. There's still randomness so identical-stat horses can differ.
 */
export function rollRunningStyle(stats: { speed: number; stamina: number; acceleration: number }, rng: Rng): RunningStyle {
  const earlyBias = (stats.speed + stats.acceleration) / 2;
  const lateBias = stats.stamina;
  const tilt = earlyBias - lateBias; // ~ -50..+50
  const r = rng.next() * 100 - tilt; // tilt shifts the distribution
  if (r < 25) return "E";
  if (r < 55) return "EP";
  if (r < 80) return "P";
  return "S";
}

/**
 * Generate random weather condition
 */
export function randomWeather(rng: Rng): Weather {
  const r = rng.next();
  if (r < 0.45) return "sunny";
  if (r < 0.70) return "cloudy";
  if (r < 0.85) return "rainy";
  if (r < 0.95) return "sunset";
  return "night";
}

/**
 * Generate random track condition
 */
export function randomTrackCondition(rng: Rng): TrackCondition {
  const r = rng.next();
  if (r < 0.6) return "fast";
  if (r < 0.85) return "good";
  if (r < 0.95) return "soft";
  return "heavy";
}

/**
 * Generate random horse name
 */
const ADJECTIVES = [
  "Thunder", "Silver", "Midnight", "Royal", "Golden", "Wild", "Swift", "Iron",
  "Crimson", "Shadow", "Lucky", "Northern", "Whispering", "Velvet", "Stormy",
  "Brave", "Noble", "Mystic", "Blazing", "Quiet", "Diamond", "Emerald", "Roaring",
];

const NOUNS = [
  "Bullet", "Star", "Spirit", "Comet", "Dancer", "Arrow", "Knight", "Whisper",
  "Flame", "Tide", "Empress", "Legacy", "Dream", "Charger", "Echo", "Bandit",
  "Saint", "Reverie", "Tempest", "Mirage", "Halo", "Voyager", "Sonnet",
];

export function randomHorseName(rng: Rng): string {
  const a = rng.pick(ADJECTIVES);
  const n = rng.pick(NOUNS);
  return `${a} ${n}`;
}

/**
 * Generate random silk color
 */
const SILKS = [
  "#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c",
  "#0891b2", "#db2777", "#ca8a04", "#475569", "#0d9488",
];

export function randomSilk(rng: Rng): string {
  return rng.pick(SILKS);
}

/**
 * Generate random race name
 */
const RACE_PREFIXES = [
  "Ascot", "Belmont", "Churchill", "Doncaster", "Epsom", "Flemington",
  "Goodwood", "Hialeah", "Irish", "Kentucky", "Longchamp", "Newmarket",
  "Oaklawn", "Pimlico", "Saratoga", "Tokyo",
];

const RACE_SUFFIXES = ["Cup", "Stakes", "Trophy", "Classic", "Handicap", "Plate", "Mile", "Sprint"];

export function randomRaceName(rng: Rng): string {
  const a = rng.pick(RACE_PREFIXES);
  const b = rng.pick(RACE_SUFFIXES);
  return `${a} ${b}`;
}

const JOCKEY_FIRST_NAMES = [
  "Frankie", "Ryan", "Lester", "Bill", "Mike", "Joel", "Irad", "Jose", "Flavien", "Christophe",
  "James", "William", "Oisin", "Tom", "Ben", "Kerrin", "Hugh", "Zac", "Joao", "Yutaka",
  "Mirco", "Lanfranco", "Olivier", "Gerald", "Pat", "Ruby", "Davy", "Paul", "Rachael", "Victor",
  "John", "Laffit", "Pat", "Gary", "Angel", "Jerry", "Kent", "Corey", "Julien", "Tyler"
];

const JOCKEY_LAST_NAMES = [
  "Dettori", "Moore", "Piggott", "Shoemaker", "Smith", "Rosario", "Ortiz", "Prat", "Soumillon", "McDonald",
  "Marquand", "Doyle", "Murphy", "Curtis", "McEvoy", "Bowman", "Purton", "Moreira", "Take", "Demuro",
  "Peslier", "Mosse", "Eddery", "Walsh", "Russell", "Townend", "Blackmore", "Stevens", "Velazquez", "Geroux",
  "Espinoza", "Velazquez", "Day", "Bailey", "Cordero", "Bailey", "Desormeaux", "Nakatani", "Leparoux", "Gaffalione"
];

export function randomJockeyName(rng: Rng): string {
  const f = rng.pick(JOCKEY_FIRST_NAMES);
  const l = rng.pick(JOCKEY_LAST_NAMES);
  return `${f} ${l}`;
}
