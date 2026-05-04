import type { Race, RaceClass } from "../types";
import type { Rng } from "../rng";
import type { GradedRace } from "../gradedRaces";
import { generateUUID } from "../uuid";
import { rand, randomWeather, randomTrackCondition } from "@/core/common/random";
import { randomRaceName } from "../names";

/**
 * Single authoritative class config shared by the generic fallback generator
 * and northAmerica.ts. Replaces the identical classConfig in horseGen.ts and
 * NA_CLASS_CONFIG in northAmerica.ts.
 */
export const CLASS_CONFIG: Record<RaceClass, { entry: number; purse: number; minStat?: number; dist: [number, number] }> = {
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

export function makeGradedRace(g: GradedRace, gameDay: number, rng: Rng): Race {
  const entryFee = g.grade === "G1" ? 2500 : g.grade === "G2" ? 1500 : 1000;
  const minStat = g.grade === "G1" ? 78 : g.grade === "G2" ? 70 : 62;
  return {
    id: generateUUID(rng),
    name: g.name,
    day: gameDay,
    distance: g.distance,
    raceClass: "Graded",
    entryFee,
    purse: g.purse,
    minStat,
    fieldSize: 12,
    entries: [],
    resolved: false,
    graded: { key: g.key, grade: g.grade, track: g.track, trackId: g.trackId, surface: g.surface },
    restrictions: g.restrictions,
    weather: randomWeather(rng),
    trackCondition: randomTrackCondition(rng),
  };
}

export function generateRace(day: number, rng: Rng): Race {
  const r = rng.next();
  let cls: RaceClass;
  if (r < 0.25) cls = "Maiden";
  else if (r < 0.30) cls = "MaidenClaiming";
  else if (r < 0.45) cls = "Allowance";
  else if (r < 0.50) cls = "Claiming";
  else if (r < 0.60) cls = "Stakes";
  else if (r < 0.65) cls = "Handicap";
  else if (r < 0.70) cls = "OptionalClaiming";
  else if (r < 0.75) cls = "StarterAllowance";
  else if (r < 0.80) cls = "MaidenSpecialWeight";
  else if (r < 0.85) cls = "StarterHandicap";
  else if (r < 0.90) cls = "MaidenOptionalClaiming";
  else if (r < 0.95) cls = "MaidenStakes";
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
    trackCondition: randomTrackCondition(rng),
  };
}
