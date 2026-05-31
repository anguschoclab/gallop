/**
 * raceGeneration/raceGen.ts - Base race generation
 *
 * This file provides the single authoritative class config shared by the generic
 * fallback generator and northAmerica.ts, with functions for creating graded races
 * and generating races.
 *
 * Dependencies: ../types (Race, RaceClass), ../rng (Rng, nondeterministicRng), @/core/data/gradedRaces (GradedRace), ../uuid (generateUUID), @/core/common/random (rand, randomWeather), @/core/trackConditions (randomTrackConditionWithClimateBias), @/core/race/naming/legacyFallback (randomRaceName)
 * Related files: northAmerica.ts (uses class config), raceSchedule.ts (uses race generation)
 */

import type { Race, RaceClass } from "../types";
import type { Rng } from "@/game/rng";
import { nondeterministicRng } from "@/game/rng";
import type { GradedRace } from "@/core/data/gradedRaces";
import { generateUUID } from "@/core/uuid";
import { rand, randomWeather } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/trackConditions";
import { randomRaceName } from "@/core/race/naming/legacyFallback";
import {
  ENTRY_MAIDEN,
  PURSE_MAIDEN,
  ENTRY_MAIDEN_SPECIAL_WEIGHT,
  PURSE_MAIDEN_SPECIAL_WEIGHT,
  MINSTAT_MAIDEN_SPECIAL_WEIGHT,
  ENTRY_MAIDEN_CLAIMING,
  PURSE_MAIDEN_CLAIMING,
  ENTRY_MAIDEN_OPTIONAL_CLAIMING,
  PURSE_MAIDEN_OPTIONAL_CLAIMING,
  MINSTAT_MAIDEN_OPTIONAL_CLAIMING,
  ENTRY_MAIDEN_STAKES,
  PURSE_MAIDEN_STAKES,
  MINSTAT_MAIDEN_STAKES,
  ENTRY_ALLOWANCE,
  PURSE_ALLOWANCE,
  MINSTAT_ALLOWANCE,
  ENTRY_OPTIONAL_CLAIMING,
  PURSE_OPTIONAL_CLAIMING,
  MINSTAT_OPTIONAL_CLAIMING,
  ENTRY_STARTER_ALLOWANCE,
  PURSE_STARTER_ALLOWANCE,
  MINSTAT_STARTER_ALLOWANCE,
  ENTRY_STARTER_HANDICAP,
  PURSE_STARTER_HANDICAP,
  MINSTAT_STARTER_HANDICAP,
  ENTRY_STAKES,
  PURSE_STAKES,
  MINSTAT_STAKES,
  ENTRY_CLAIMING,
  PURSE_CLAIMING,
  MINSTAT_CLAIMING,
  ENTRY_HANDICAP,
  PURSE_HANDICAP,
  MINSTAT_HANDICAP,
  ENTRY_LISTED,
  PURSE_LISTED,
  MINSTAT_LISTED,
  ENTRY_GROUP,
  PURSE_GROUP,
  MINSTAT_GROUP,
  GRADE_G1_MIN_STAT,
  GRADE_G2_MIN_STAT,
  GRADE_G3_MIN_STAT,
  RACE_CLASS_MAIDEN_PROB,
  RACE_CLASS_ALLOWANCE_PROB,
  RACE_CLASS_HANDICAP_PROB,
  RACE_CLASS_STARTER_ALLOWANCE_PROB,
  RACE_CLASS_STARTER_HANDICAP_PROB,
  RACE_CLASS_MAIDEN_STAKES_PROB,
} from "@/game/constants";

/**
 * Single authoritative class config shared by the generic fallback generator
 * and northAmerica.ts. Replaces the identical classConfig in horseGen.ts and
 * NA_CLASS_CONFIG in northAmerica.ts.
 */
export const CLASS_CONFIG: Record<
  RaceClass,
  { entry: number; purse: number; minStat?: number; dist: [number, number] }
> = {
  Maiden: { entry: ENTRY_MAIDEN, purse: PURSE_MAIDEN, dist: [1000, 1400] },
  MaidenSpecialWeight: {
    entry: ENTRY_MAIDEN_SPECIAL_WEIGHT,
    purse: PURSE_MAIDEN_SPECIAL_WEIGHT,
    minStat: MINSTAT_MAIDEN_SPECIAL_WEIGHT,
    dist: [1000, 1600],
  },
  MaidenClaiming: {
    entry: ENTRY_MAIDEN_CLAIMING,
    purse: PURSE_MAIDEN_CLAIMING,
    dist: [1000, 1400],
  },
  MaidenOptionalClaiming: {
    entry: ENTRY_MAIDEN_OPTIONAL_CLAIMING,
    purse: PURSE_MAIDEN_OPTIONAL_CLAIMING,
    minStat: MINSTAT_MAIDEN_OPTIONAL_CLAIMING,
    dist: [1000, 1400],
  },
  MaidenStakes: {
    entry: ENTRY_MAIDEN_STAKES,
    purse: PURSE_MAIDEN_STAKES,
    minStat: MINSTAT_MAIDEN_STAKES,
    dist: [1200, 1800],
  },
  Allowance: {
    entry: ENTRY_ALLOWANCE,
    purse: PURSE_ALLOWANCE,
    minStat: MINSTAT_ALLOWANCE,
    dist: [1200, 1800],
  },
  OptionalClaiming: {
    entry: ENTRY_OPTIONAL_CLAIMING,
    purse: PURSE_OPTIONAL_CLAIMING,
    minStat: MINSTAT_OPTIONAL_CLAIMING,
    dist: [1200, 1800],
  },
  StarterAllowance: {
    entry: ENTRY_STARTER_ALLOWANCE,
    purse: PURSE_STARTER_ALLOWANCE,
    minStat: MINSTAT_STARTER_ALLOWANCE,
    dist: [1200, 1800],
  },
  StarterHandicap: {
    entry: ENTRY_STARTER_HANDICAP,
    purse: PURSE_STARTER_HANDICAP,
    minStat: MINSTAT_STARTER_HANDICAP,
    dist: [1200, 2000],
  },
  Stakes: { entry: ENTRY_STAKES, purse: PURSE_STAKES, minStat: MINSTAT_STAKES, dist: [1400, 2200] },
  Claiming: {
    entry: ENTRY_CLAIMING,
    purse: PURSE_CLAIMING,
    minStat: MINSTAT_CLAIMING,
    dist: [1000, 1800],
  },
  Handicap: {
    entry: ENTRY_HANDICAP,
    purse: PURSE_HANDICAP,
    minStat: MINSTAT_HANDICAP,
    dist: [1200, 2400],
  },
  Listed: { entry: ENTRY_LISTED, purse: PURSE_LISTED, minStat: MINSTAT_LISTED, dist: [1400, 2400] },
  Group: { entry: ENTRY_GROUP, purse: PURSE_GROUP, minStat: MINSTAT_GROUP, dist: [1600, 2400] },
  Graded: { entry: 0, purse: 0, dist: [1200, 2400] },
};

/**
 * Create a graded race from a GradedRace definition.
 *
 * Sets entry fees and minimum stats based on grade, generates random weather
 * and track conditions with temperate/turf bias.
 *
 * @param g - Graded race definition
 * @param gameDay - Day the race takes place
 * @param rng - Random number generator (defaults to nondeterministic)
 * @returns Complete race object
 */
export function makeGradedRace(
  g: GradedRace,
  gameDay: number,
  rng: Rng = nondeterministicRng(),
): Race {
  const entryFee = g.grade === "G1" ? 2500 : g.grade === "G2" ? 1500 : 1000;
  const minStat =
    g.grade === "G1" ? GRADE_G1_MIN_STAT : g.grade === "G2" ? GRADE_G2_MIN_STAT : GRADE_G3_MIN_STAT;
  return {
    id: generateUUID(rng),
    name: g.name,
    day: gameDay,
    distance: g.distance,
    raceClass: "Graded",
    entryFee,
    purse: g.purse,
    minStat,
    fieldSize: g.fieldSize ?? 12,
    entries: [],
    resolved: false,
    graded: {
      key: g.key,
      grade: g.grade,
      track: g.track,
      trackId: g.trackId,
      surface: g.surface,
      winAndYouInTarget: g.winAndYouInTarget,
      requiresInvitation: g.requiresInvitation ?? (g.bcKey === "breeders-cup" ? true : undefined),
    },
    invitedHorseIds: [],
    restrictions: g.restrictions,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "turf"),
  };
}

/**
 * Generate a random race with weighted class distribution.
 *
 * Uses weighted random selection for race class, then generates distance,
 * field size, weather, and track conditions.
 *
 * @param day - Day the race takes place
 * @param rng - Random number generator (defaults to nondeterministic)
 * @returns Complete race object
 */
export function generateRace(day: number, rng: Rng = nondeterministicRng()): Race {
  const r = rng.next();
  let cls: RaceClass;
  if (r < RACE_CLASS_MAIDEN_PROB) cls = "Maiden";
  else if (r < 0.3) cls = "MaidenClaiming";
  else if (r < RACE_CLASS_ALLOWANCE_PROB) cls = "Allowance";
  else if (r < 0.5) cls = "Claiming";
  else if (r < 0.6) cls = "Stakes";
  else if (r < RACE_CLASS_HANDICAP_PROB) cls = "Handicap";
  else if (r < 0.7) cls = "OptionalClaiming";
  else if (r < RACE_CLASS_STARTER_ALLOWANCE_PROB) cls = "StarterAllowance";
  else if (r < 0.8) cls = "MaidenSpecialWeight";
  else if (r < RACE_CLASS_STARTER_HANDICAP_PROB) cls = "StarterHandicap";
  else if (r < 0.9) cls = "MaidenOptionalClaiming";
  else if (r < RACE_CLASS_MAIDEN_STAKES_PROB) cls = "MaidenStakes";
  else if (r < 0.98) cls = "Listed";
  else cls = "Group";

  const cfg = CLASS_CONFIG[cls];
  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100, rng) * 100;
  return {
    id: generateUUID(rng),
    name: randomRaceName(rng),
    day,
    distance,
    raceClass: cls,
    entryFee: cfg.entry,
    purse: cfg.purse,
    minStat: cfg.minStat,
    fieldSize: rand(6, 8, rng),
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "turf"),
  };
}
