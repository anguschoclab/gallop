import type {
  Horse,
  HorseStats,
  Hemisphere,
  RunningStyle,
  CoatColor,
  Genotype,
  HorseGender,
} from "./types";
import type { Rng } from "./rng";
import { nondeterministicRng } from "./rng";
import {
  generateGenotype,
  resolveCoatColor,
  resolveStats,
  resolveRunningStyle,
  resolveDistanceAptitude,
  resolveSurfaceAptitude,
  resolveAptitudeMultiplier,
  resolveTrait,
  resolveInjuryProneness,
  resolveSize,
  resolveGeneticMarkers,
  resolveHeartScore,
  resolveFiberBias,
  resolveStrideType,
  resolveTrackPreference,
  resolveMudAptitude,
  resolveTrainability,
  resolvePeakAge,
  resolveRecoveryRate,
  resolveFertility,
  resolveFoalingEase,
  resolveMarkings,
  resolveBleederRisk,
  resolveRoarerRisk,
  resolveOcdRisk,
  resolveRacingViable,
  computeHeterozygosity,
} from "./geneticsEngine";
import { generateUUID } from "./uuid";
import {
  rollProceduralFamily,
  RUNNING_FAMILIES,
  SIRE_FAMILIES,
  resolveBruceLoweFamily,
} from "@/core/breeding/bruceLowe";
import { rollGender, geldHorse } from "@/core/horse/gender";
import { randomHorseName, randomSilk } from "@/core/common/random";
import { resolveBloodline } from "@/core/breeding/populationGenetics";

// Resolve all DNA-derived gameplay fields from a Genotype. Centralized here
// so both `createHorseFromDNA` (foaling) and `generateHorse` (procedural) stay
// in lockstep — adding a new DNA trait is a one-place edit.
function resolveDnaTraits(genotype: Genotype) {
  return {
    heartScore: resolveHeartScore(genotype.heart),
    fiberBias: resolveFiberBias(genotype.fiberType),
    strideType: resolveStrideType(genotype.stride),
    trackPreference: resolveTrackPreference(genotype.trackBias),
    mudAptitude: resolveMudAptitude(genotype.mudAptitude),
    trainability: resolveTrainability(genotype.trainability),
    peakAge: resolvePeakAge(genotype.peakAge),
    recoveryRate: resolveRecoveryRate(genotype.recovery),
    fertility: resolveFertility(genotype.fertility),
    foalingEase: resolveFoalingEase(genotype.foalingEase),
    markings: resolveMarkings(genotype.markings),
    bleederRisk: resolveBleederRisk(genotype.health.bleeder),
    roarerRisk: resolveRoarerRisk(genotype.health.roarer),
    ocdRisk: resolveOcdRisk(genotype.health.ocd),
    racingViable: resolveRacingViable(genotype.health.efna5),
    heterozygosity: computeHeterozygosity(genotype),
  };
}

export function createHorseFromDNA(
  genotype: Genotype,
  rng: Rng,
  opts: {
    name?: string;
    age?: number;
    gender?: HorseGender;
    hemisphere?: Hemisphere;
    owned?: boolean;
  } = {},
): Horse {
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
    gender: opts.gender ?? rollGender(opts.age ?? 0, rng),
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
    geneticMarkers: resolveGeneticMarkers(genotype),
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
    lifecycleStatus: "active",
    ...resolveDnaTraits(genotype),
  };
}

export function generateHorse(
  opts: {
    tier?: "starter" | "budget" | "mid" | "elite";
    owned?: boolean;
    hemisphere?: Hemisphere;
    age?: number;
    gender?: HorseGender;
  } = {},
  rng: Rng = nondeterministicRng(),
): Horse {
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

  // Resolve bloodline from procedural sire name (for NPC horses)
  const bloodline = resolveBloodline(
    { name: randomHorseName(rng), sireName: randomHorseName(rng) } as Horse,
    { horses: [] },
  );

  const age = opts.age ?? (rng.next() < 0.2 ? rng.range(2, 3) : rng.range(2, 6));
  const gender = opts.gender ?? rollGender(age, rng);
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
    geneticMarkers: resolveGeneticMarkers(genotype),
    coatColor,
    runningStyle,
    fame: 0,
    bruceLoweFamily,
    bloodline,
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
    lifecycleStatus: "active",
    ...resolveDnaTraits(genotype),
  };
}
