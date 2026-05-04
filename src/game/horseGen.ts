import type { Horse, Race, RaceClass, Hemisphere, HealthStatus } from "./types";
import type { GradedRace } from "./gradedRaces";
import { generateUUID } from "./uuid";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import { rollProceduralFamily, RUNNING_FAMILIES, SIRE_FAMILIES } from "@/core/breeding/bruceLowe";
import {
  rand,
  randConformation,
  randTemperament,
  generateGeneticMarkers,
  rollRunningStyle,
  randomCoatColor,
  randomWeather,
  randomTrackCondition,
  randomHorseName,
  randomSilk,
  randomRaceName,
} from "@/core/common/random";

export function generateHorse(opts: { tier?: "starter" | "budget" | "mid" | "elite"; owned?: boolean; hemisphere?: Hemisphere } = {}): Horse {
  const tier = opts.tier ?? "budget";
  const ranges: Record<string, [number, number]> = {
    starter: [30, 55],
    budget: [25, 60],
    mid: [45, 75],
    elite: [60, 90],
  };
  const [lo, hi] = ranges[tier];
  const potentialRanges: Record<string, [number, number]> = {
    starter: [65, 80],
    budget: [60, 80],
    mid: [75, 90],
    elite: [85, 100],
  };
  const [pLo, pHi] = potentialRanges[tier];
  const age = rand(2, 6);
  const isMale = Math.random() < 0.5;
  const gender = age <= 2 ? (isMale ? "colt" : "filly") : (isMale ? "horse" : "mare");
  const hemisphere: Hemisphere = opts.hemisphere ?? (Math.random() < 0.5 ? "Northern" : "Southern");

  const stats = {
    speed: rand(lo, hi),
    stamina: rand(lo, hi),
    acceleration: rand(lo, hi),
    consistency: rand(lo, hi),
  };
  // Bruce Lowe family — procedurally assigned. Running families (1-5) get a
  // small speed/acceleration nudge; this is mostly cosmetic but makes the
  // family number visible in actual gameplay.
  const bruceLoweFamily = rollProceduralFamily();
  if (RUNNING_FAMILIES.has(bruceLoweFamily)) {
    stats.speed = Math.min(hi, stats.speed + 1);
    stats.acceleration = Math.min(hi, stats.acceleration + 1);
  }
  // Sire families (3, 8, 11, 12, 14) lift potential ceiling for males.
  let potentialBoost = 0;
  if (SIRE_FAMILIES.has(bruceLoweFamily) && (gender === "colt" || gender === "horse")) {
    potentialBoost = 2;
  }
  return {
    id: generateUUID(),
    name: randomHorseName(),
    age,
    gender,
    hemisphere,
    silk: randomSilk(),
    stats,
    energy: 100,
    form: 0,
    potential: Math.min(100, rand(pLo, pHi) + potentialBoost),
    raceHistory: [],
    owned: opts.owned ?? false,
    sireName: randomHorseName(),
    damName: randomHorseName(),
    conformation: randConformation(),
    temperament: randTemperament(),
    geneticMarkers: generateGeneticMarkers(),
    healthStatus: "healthy",
    coatColor: randomCoatColor(),
    runningStyle: rollRunningStyle(stats),
    fame: 0, // Player horses start with no fame
    bruceLoweFamily,
  };
}

export function horsePrice(h: Horse): number {
  const overall = (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4;
  const ageMod = h.age <= 3 ? 1.2 : h.age >= 6 ? 0.7 : 1;
  const potMod = 0.5 + h.potential / 100;
  return Math.round((overall * 80 * ageMod * potMod) / 50) * 50;
}

// Pedigree-aware variant. When a horses[] context is available, applies the
// same multiplier the auction uses so the consignment reserve and the
// player's mental price track each other.
export function horsePriceWithPedigree(h: Horse, allHorses: Horse[]): number {
  const base = horsePrice(h);
  return Math.round(base * pedigreeMultiplier(h, { horses: allHorses }) / 50) * 50;
}

const classConfig: Record<RaceClass, { entry: number; purse: number; minStat?: number; dist: [number, number] }> = {
  // Maiden races
  Maiden: { entry: 100, purse: 2000, dist: [1000, 1400] },
  MaidenSpecialWeight: { entry: 150, purse: 3000, minStat: 40, dist: [1000, 1600] },
  MaidenClaiming: { entry: 100, purse: 2000, dist: [1000, 1400] },
  MaidenOptionalClaiming: { entry: 120, purse: 2500, minStat: 35, dist: [1000, 1400] },
  MaidenStakes: { entry: 500, purse: 10000, minStat: 45, dist: [1200, 1800] },
  // Allowance and condition races
  Allowance: { entry: 300, purse: 6000, minStat: 50, dist: [1200, 1800] },
  OptionalClaiming: { entry: 350, purse: 7000, minStat: 52, dist: [1200, 1800] },
  StarterAllowance: { entry: 250, purse: 5000, minStat: 48, dist: [1200, 1800] },
  StarterHandicap: { entry: 200, purse: 4500, minStat: 45, dist: [1200, 2000] },
  // Stakes and higher
  Stakes: { entry: 800, purse: 18000, minStat: 65, dist: [1400, 2200] },
  Claiming: { entry: 150, purse: 3000, minStat: 40, dist: [1000, 1800] },
  Handicap: { entry: 400, purse: 8000, minStat: 55, dist: [1200, 2400] },
  Listed: { entry: 1500, purse: 40000, minStat: 72, dist: [1400, 2400] },
  Group: { entry: 2000, purse: 50000, minStat: 78, dist: [1600, 2400] },
  Graded: { entry: 0, purse: 0, dist: [1200, 2400] },
};

export function makeGradedRace(g: GradedRace, gameDay: number): Race {
  const entryFee = g.grade === "G1" ? 2500 : g.grade === "G2" ? 1500 : 1000;
  const minStat = g.grade === "G1" ? 78 : g.grade === "G2" ? 70 : 62;
  return {
    id: generateUUID(),
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
    weather: randomWeather(),
    trackCondition: randomTrackCondition(),
  };
}

export function generateRace(day: number): Race {
  const r = Math.random();
  // Expanded distribution for new race classes
  // This is a temporary fallback - regional generators will handle distribution
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

  const cfg = classConfig[cls];
  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100) * 100;
  return {
    id: generateUUID(),
    name: randomRaceName(),
    day,
    distance,
    raceClass: cls,
    entryFee: cfg.entry,
    purse: cfg.purse,
    minStat: cfg.minStat,
    fieldSize: rand(6, 8),
    entries: [],
    resolved: false,
    weather: randomWeather(),
    trackCondition: randomTrackCondition(),
  };
}
