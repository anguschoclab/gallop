import type { Horse, HorseStats, Hemisphere, Rng, RunningStyle, CoatColor, Genotype, HorseGender } from "./types";
import { generateGenotype, resolveCoatColor, resolveStats, resolveRunningStyle, resolveDistanceAptitude, resolveSurfaceAptitude, resolveAptitudeMultiplier, resolveTrait, resolveInjuryProneness, resolveSize } from "./geneticsEngine";
import { generateUUID } from "./uuid";
import { rollProceduralFamily, RUNNING_FAMILIES, SIRE_FAMILIES } from "@/core/breeding/bruceLowe";
import {
  randomHorseName,
  randomSilk,
  generateGeneticMarkers,
} from "@/core/common/random";

export function createHorseFromDNA(genotype: Genotype, rng: Rng, opts: { name?: string; age?: number; gender?: HorseGender; hemisphere?: Hemisphere; owned?: boolean } = {}): Horse {
  const stats = resolveStats(genotype.stats);
  const coatColor = resolveCoatColor(genotype.color);
  const runningStyle = resolveRunningStyle(genotype.style);
  const conformation = resolveTrait(genotype.physical);
  const temperament = resolveTrait(genotype.mental);
  
  const distanceAptitude = resolveDistanceAptitude(genotype.preferences.distance);
  const surfaceAptitude = resolveSurfaceAptitude(genotype.preferences.surface);
  const climbingAptitude = resolveAptitudeMultiplier(genotype.preferences.climbing);
  let corneringAptitude = resolveAptitudeMultiplier(genotype.preferences.cornering);
  const injuryProneness = resolveInjuryProneness(genotype.durability);
  const { height, weight } = resolveSize(genotype.size);

  // Size impact on cornering
  const sizeSum = genotype.size[0] + genotype.size[1];
  if (sizeSum >= 8) corneringAptitude -= 0.15;
  if (sizeSum <= 4) corneringAptitude += 0.1;

  const dnaPotential = (stats.speed + stats.stamina + stats.acceleration + stats.consistency) / 4;

  return {
    id: generateUUID(rng),
    name: opts.name ?? "Unnamed Foal",
    age: opts.age ?? 0,
    gender: opts.gender ?? (rng.next() < 0.5 ? (rng.next() < 0.2 ? "gelding" : "colt") : "filly"),
    hemisphere: opts.hemisphere ?? "Northern",
    silk: randomSilk(rng),
    stats,
    genotype,
    energy: 100,
    form: 0,
    potential: Math.round(dnaPotential + rng.range(-1, 3)),
    raceHistory: [],
    owned: opts.owned ?? false,
    conformation,
    temperament,
    healthStatus: "healthy",
    geneticMarkers: generateGeneticMarkers(rng),
    coatColor,
    runningStyle,
    fame: 0,
    distanceAptitude,
    surfaceAptitude,
    climbingAptitude,
    corneringAptitude,
    injuryProneness,
    height,
    weight,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
  };
}

export function generateHorse(rng: Rng, opts: { tier?: "starter" | "budget" | "mid" | "elite"; owned?: boolean; hemisphere?: Hemisphere; age?: number; gender?: HorseGender } = {}): Horse {
  const tier = opts.tier ?? "budget";
  
  // 1. Generate Biological Identity (DNA)
  const genotype = generateGenotype(rng, tier);

  // 2. Resolve Phenotype (Visible traits)
  const stats = resolveStats(genotype.stats);
  const coatColor = resolveCoatColor(genotype.color);
  const runningStyle = resolveRunningStyle(genotype.style);
  const conformation = resolveTrait(genotype.physical);
  const temperament = resolveTrait(genotype.mental);
  
  // 3. Resolve Aptitudes from DNA
  const distanceAptitude = resolveDistanceAptitude(genotype.preferences.distance);
  const surfaceAptitude = resolveSurfaceAptitude(genotype.preferences.surface);
  const climbingAptitude = resolveAptitudeMultiplier(genotype.preferences.climbing);
  let corneringAptitude = resolveAptitudeMultiplier(genotype.preferences.cornering);
  const injuryProneness = resolveInjuryProneness(genotype.durability);
  const { height, weight } = resolveSize(genotype.size);

  // Size impact on cornering
  const sizeSum = genotype.size[0] + genotype.size[1];
  if (sizeSum >= 8) corneringAptitude -= 0.15;
  if (sizeSum <= 4) corneringAptitude += 0.1;

  // 4. Procedural Metadata
  const bruceLoweFamily = rollProceduralFamily(rng);
  // Sire families (3, 8, 11, 12, 14) lift potential slightly for males.
  let potentialBoost = 0;
  
  const age = opts.age ?? (rng.next() < 0.2 ? rng.range(2, 3) : rng.range(2, 6));
  const isMale = rng.next() < 0.5;
  const isGelding = isMale && rng.next() < 0.35; // 35% of males are geldings
  const gender = opts.gender ?? (age <= 2 ? (isMale ? (isGelding ? "gelding" : "colt") : "filly") : (isMale ? (isGelding ? "gelding" : "horse") : "mare"));
  const hemisphere: Hemisphere = opts.hemisphere ?? (rng.next() < 0.5 ? "Northern" : "Southern");

  if (SIRE_FAMILIES.has(bruceLoweFamily) && (gender === "colt" || gender === "horse")) {
    potentialBoost = 2;
  }

  // Potential is derived from DNA + small random factor (epigenetics)
  const dnaPotential = (stats.speed + stats.stamina + stats.acceleration + stats.consistency) / 4;
  const potential = Math.round(dnaPotential + rng.range(-2, 5) + potentialBoost);

  return {
    id: generateUUID(rng),
    name: randomHorseName(rng),
    age,
    gender,
    hemisphere,
    silk: randomSilk(rng),
    stats,
    genotype,
    energy: 100,
    form: 0,
    potential: Math.min(100, potential),
    raceHistory: [],
    owned: opts.owned ?? false,
    sireName: randomHorseName(rng),
    damName: randomHorseName(rng),
    conformation,
    temperament,
    healthStatus: "healthy",
    coatColor,
    runningStyle,
    fame: 0,
    bruceLoweFamily,
    distanceAptitude,
    surfaceAptitude,
    climbingAptitude,
    corneringAptitude,
    injuryProneness,
    height,
    weight,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
  };
}

export function horsePrice(h: Horse): number {
  const overall = (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4;
  const ageMod = h.age <= 3 ? 1.2 : h.age >= 6 ? 0.7 : 1;
  const potMod = 0.5 + h.potential / 100;
  
  // Biological Multipliers
  let bioMod = 1.0;
  if (h.conformation === "excellent") bioMod += 0.05;
  if (h.temperament === "excellent") bioMod += 0.05;
  if (h.conformation === "poor") bioMod -= 0.1;
  if (h.temperament === "poor") bioMod -= 0.1;

  // Durability Modifier (Iron Horse vs Fragile)
  if (h.injuryProneness < 0.04) bioMod += 0.15;
  if (h.injuryProneness > 0.08) bioMod -= 0.2;

  return Math.round((overall * 80 * ageMod * potMod * bioMod) / 50) * 50;
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

/**
 * Transition a male horse (Colt/Horse) to a Gelding.
 * Improves consistency (reduces noise) but removes breeding capability.
 */
export function geldHorse(h: Horse): Horse {
  if (h.gender !== "colt" && h.gender !== "horse") return h;

  return {
    ...h,
    gender: "gelding",
  };
}
