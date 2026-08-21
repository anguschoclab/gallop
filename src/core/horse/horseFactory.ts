/**
 * horseFactory.ts - Horse creation and foaling
 *
 * This file provides functions for creating horses from genetics, resolving
 * phenotypes, and handling pregnancy outcomes including live foals and complications.
 *
 * Dependencies: @/game/types (Horse, Genotype, HorseGender, Hemisphere, Pregnancy, Pedigree, HorseStats, CoatColor, RunningStyle, Stable, StableTier), @/core/common/types (Rng), @/game/rng (createRng, hashStr, nondeterministicRng), @/core/common/uuid (generateUUID), ./proceduralPortrait (generateAppearanceDNA, getPalette), @/core/genetics/generation (generateGenotype, generateDeterministicGenotype, generateResearchBasedGenotype), @/core/genetics/phenotype (various resolve functions), @/core/breeding/bruceLowe (resolveBruceLoweFamily), @/core/breeding/populationGenetics (resolveBloodline, getGenomeModifiers), @/core/breeding/eligibility (canBreed), @/game/constants (various constants)
 * Related files: Used throughout game initialization and breeding systems
 */

import type {
  Horse,
  Genotype,
  HorseGender,
  Hemisphere,
  Pedigree,
  HorseStats,
  CoatColor,
  RunningStyle,
  Stable,
  StableTier,
} from "@/game/types";
import type { Rng } from "@/core/common/types";
import {
  makePlayerOwned,
  makeNpcOwned,
  makeUnowned,
  type HorseOwnership,
} from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

import { hashStr, nondeterministicRng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { generateAppearanceDNA, getPalette } from "@/core/horse/proceduralPortrait";
import {
  generateGenotype,
  generateDeterministicGenotype,
  generateResearchBasedGenotype,
} from "@/core/genetics/generation";
import { calculateOverallRating } from "@/core/horse/stats";
import {
  resolveCoatColor,
  resolveStats,
  resolveRunningStyle,
  resolveDistanceAptitude,
  resolveSurfaceAptitude,
  resolveAptitudeMultiplier,
  resolveTrait,
  TRAIT_VALUES,
  resolveInjuryProneness,
  resolveSize,
  resolveGeneticMarkers,
  resolveHeartScore,
  resolveFiberBias,
  resolveStrideType,
  resolveTrackPreference,
  resolveMudAptitude,
  resolveWeatherPreference,
  resolveTrainability,
  resolvePeakAge,
  resolveRecoveryRate,
  resolveFertility,
  resolveFoalingEase,
  resolveMarkings,
  resolveBleederRisk,
  resolveRoarerRisk,
  resolveRacingViable,
  resolveHealthStatus,
  computeHeterozygosity,
} from "@/core/genetics/phenotype";
import { rollGender, geldHorse } from "@/core/horse/gender";
import { randomSilk, rand } from "@/core/common/random";
import { rollProceduralFamily } from "@/core/breeding/bruceLowe";
import {
  generateProceduralHorseName,
  type NamingContext,
} from "@/core/horse/naming/nameGenerator.ts";
import { resolveBloodline } from "@/core/breeding/populationGenetics";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { getRegionalSystem } from "@/core/race/naming/raceNameGenerator";
import { shouldRetireAtStartup, defaultStudParams } from "@/core/breeding/stallions";
import {
  shouldGenerateHorseOfAge,
  createHorseGenAIState,
  recordHorseGeneration,
} from "@/core/ai/horseGenAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { activeStallions2020s, type PedigreeHorse } from "@/data/pedigreeData";
import { clamp } from "@/core/common/math";
import {
  POTENTIAL_MIN,
  POTENTIAL_MAX,
  CORNERING_APTITUDE_SIZE_LARGE_THRESHOLD,
  CORNERING_APTITUDE_LARGE_PENALTY,
  CORNERING_APTITUDE_SIZE_SMALL_THRESHOLD,
  CORNERING_APTITUDE_SMALL_BONUS,
} from "@/constants";

// Re-export foaling types and functions for backward compatibility
export type { FoalOutcome } from "./foaling";
export { resolveFoaling } from "./foaling";

// --- Internal Helpers ---

/**
 * Resolve high-level phenotype traits from a genotype.
 *
 * @param genotype - The genetic blueprint to resolve traits from
 * @returns Object containing heart score, fiber bias, trainability, and other resolved traits
 */
function resolveDnaTraits(genotype: Genotype) {
  return {
    heartScore: resolveHeartScore(genotype.heart),
    fiberBias: resolveFiberBias(genotype.fiberType),
    strideType: resolveStrideType(genotype.stride),
    trackPreference: resolveTrackPreference(genotype.trackBias),
    mudAptitude: resolveMudAptitude(genotype.mudAptitude),
    weatherPreference: resolveWeatherPreference(genotype.weatherAptitude),
    trainability: resolveTrainability(genotype.trainability),
    peakAge: resolvePeakAge(genotype.peakAge),
    recoveryRate: resolveRecoveryRate(genotype.recovery),
    fertility: resolveFertility(genotype.fertility),
    foalingEase: resolveFoalingEase(genotype.foalingEase),
    markings: resolveMarkings(genotype.markings),
    bleederRisk: resolveBleederRisk(genotype.health.bleeder),
    roarerRisk: resolveRoarerRisk(genotype.health.roarer),
    ocdRisk: 0, // Simplified for now
    racingViable: resolveRacingViable(genotype.health.efna5),
    heterozygosity: computeHeterozygosity(genotype),
  };
}

// --- Lazy Phenotype Resolution ---

/**
 * Resolve all phenotype traits for a horse from its stored genotype.
 *
 * This is a **pure function** — no store access. Uses a deterministic RNG seeded
 * from the horse's ID so the same horse always resolves to the same phenotype
 * regardless of when or how many times it is called.
 *
 * @param horse - A horse with `phenotypeResolved` falsy and a valid `genotype`.
 * @returns A new Horse object with all phenotype fields populated and `phenotypeResolved: true`.
 */
export function resolvePhenotype(horse: Horse): Horse {
  if (horse.phenotypeResolved !== false) return horse;
  const genotype = horse.genotype;

  const confTrait = resolveTrait(genotype.physical);
  const tempTrait = resolveTrait(genotype.mental);
  const conformation = TRAIT_VALUES[confTrait] * 25;
  const temperament = TRAIT_VALUES[tempTrait] * 25;

  const stats = resolveStats(genotype.stats, conformation, temperament);
  const currentAbility = calculateOverallRating({ ...horse, stats } as Horse);
  const potential = Math.max(horse.potential, currentAbility);
  const coatColor = resolveCoatColor(genotype.color);
  const runningStyle = resolveRunningStyle(genotype.style);

  const distanceAptitude = resolveDistanceAptitude(genotype.preferences.distance);
  const surfaceAptitude = resolveSurfaceAptitude(genotype.preferences.surface);
  const climbingAptitude = resolveAptitudeMultiplier(genotype.preferences.climbing);
  let corneringAptitude = resolveAptitudeMultiplier(genotype.preferences.cornering);
  const injuryProneness = resolveInjuryProneness(genotype.durability);
  const { height, weight } = resolveSize(genotype.size);

  const sizeSum = genotype.size[0] + genotype.size[1];
  if (sizeSum >= CORNERING_APTITUDE_SIZE_LARGE_THRESHOLD)
    corneringAptitude -= CORNERING_APTITUDE_LARGE_PENALTY;
  if (sizeSum <= CORNERING_APTITUDE_SIZE_SMALL_THRESHOLD)
    corneringAptitude += CORNERING_APTITUDE_SMALL_BONUS;

  const dnaTraits = resolveDnaTraits(genotype);

  return {
    ...horse,
    conformation,
    temperament,
    stats,
    potential,
    coatColor,
    runningStyle,
    distanceAptitude,
    surfaceAptitude,
    climbingAptitude,
    corneringAptitude,
    injuryProneness,
    height,
    weight,
    geneticMarkers: resolveGeneticMarkers(genotype),
    healthStatus: resolveHealthStatus(genotype.health),
    ...dnaTraits,
    appearance: generateAppearanceDNA(hashStr(horse.id), undefined, getPalette(coatColor)),
    phenotypeResolved: true,
  };
}

/**
 * Return the horse with its phenotype resolved. No-op if already resolved.
 *
 * @param horse - Any horse, possibly unresolved.
 * @returns The same horse if already resolved, or a new object with phenotype populated.
 */
export function ensurePhenotypeResolved(horse: Horse): Horse {
  return horse.phenotypeResolved !== false ? horse : resolvePhenotype(horse);
}

// --- Public Factory API ---

/**
 * Creates a Horse skeleton from a genotype with phenotype resolution **deferred**.
 *
 * Identity, structure, and RNG-consuming fields (id, silk, potential) are set here
 * so the caller's RNG sequence is preserved. Phenotype fields (stats, aptitudes,
 * coat, etc.) are left at safe zero/default values and `phenotypeResolved` is `false`.
 * Call `resolvePhenotype(horse)` or `ensurePhenotypeResolved(horse)` when the
 * phenotype is actually needed.
 *
 * @param {Genotype} genotype - The genetic blueprint for the horse.
 * @param {Rng} rng - Seeded random number generator.
 * @param {Object} [opts={}] - Configuration options.
 * @param {string} [opts.name] - The horse's name.
 * @param {number} [opts.age] - Current age in years.
 * @param {HorseGender} [opts.gender] - Biological gender.
 * @param {Hemisphere} [opts.hemisphere] - Racing hemisphere.
 * @param {HorseOwnership} [opts.ownership] - Ownership status (player, npc, unowned).
 * @param {number} [opts.createdAtDay] - Simulation day of creation.
 * @returns {Horse} A Horse object with phenotypeResolved=false.
 */
export function createHorseFromDNA(
  genotype: Genotype,
  rng: Rng,
  opts: {
    name?: string;
    age?: number;
    gender?: HorseGender;
    hemisphere?: Hemisphere;
    ownership?: HorseOwnership;
    createdAtDay?: number;
  } = {},
): Horse {
  // Consume rng slots for identity fields to preserve caller's RNG sequence
  const id = generateUUID(rng);
  const silk = randomSilk(rng);
  const potential = POTENTIAL_MIN + Math.floor(rng.next() * (POTENTIAL_MAX - POTENTIAL_MIN));
  // Consume the appearance-seed slot so downstream rng calls stay aligned
  rng.next();

  const horse: Horse = {
    id,
    name: opts.name ?? "Unnamed",
    age: opts.age ?? 2,
    gender: opts.gender ?? "colt",
    hemisphere: opts.hemisphere ?? "Northern",
    silk,
    stats: {
      speed: 0,
      stamina: 0,
      acceleration: 0,
      consistency: 0,
      temperament: 0,
      conformation: 0,
    },
    genotype,
    energy: 100,
    form: 50,
    potential,
    fame: 0,
    fanCount: 0,
    raceHistory: [],
    ownership: opts.ownership ?? makeUnowned(),
    conformation: 0,
    temperament: 0,
    coatColor: undefined,
    runningStyle: "P",
    distanceAptitude: 0,
    surfaceAptitude: { Turf: 0.95, Dirt: 0.95, Synthetic: 0.95 },
    climbingAptitude: 1,
    corneringAptitude: 1,
    injuryProneness: 0,
    height: 0,
    weight: 0,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    healthStatus: "healthy",
    healthStatusDay: 1,
    isBlueHen: false,
    gelded: false,
    lifecycleStatus: "active",
    courseVisits: {},
    foalsProduced: [],
    sireName: "Unknown",
    damName: "Unknown",
    pedigree: { name: opts.name ?? "Unnamed", generation: 0 },
    birthDay: 1,
    fitness: 50,
    fatigue: 0,
    peakingIndex: 50,
    bloodline: "Standard",
    heartScore: 0,
    fiberBias: "balanced",
    strideType: "average",
    trackPreference: "balanced",
    mudAptitude: 1,
    weatherPreference: "all",
    trainability: 0.5,
    peakAge: 4,
    recoveryRate: 0.7,
    foalingEase: 1,
    bleederRisk: 0,
    roarerRisk: 0,
    ocdRisk: 0,
    racingViable: true,
    heterozygosity: 0,
    recoveryPoints: 100,
    createdAtDay: opts.createdAtDay,
    phenotypeResolved: false,
  };

  return horse as Horse;
}

/**
 * Generates a procedural horse, typically for use in market listings or starter rosters.
 * Handles genotype generation based on tier, age rolling, and procedural naming.
 *
 * @param {Object} [opts={}] - Generation options.
 * @param {"starter" | "budget" | "mid" | "elite"} [opts.tier] - Quality tier for genotype generation.
 * @param {HorseOwnership} [opts.ownership] - Ownership status.
 * @param {Hemisphere} [opts.hemisphere] - Racing hemisphere.
 * @param {number} [opts.age] - Horse age in years.
 * @param {HorseGender} [opts.gender] - Biological gender.
 * @param {Rng} [rng=nondeterministicRng()] - Random number generator.
 * @param {Partial<NamingContext>} [namingContext] - Context for name generation.
 * @returns {Horse} A procedurally generated Horse object.
 */
export function generateHorse(
  opts: {
    tier?: "starter" | "budget" | "mid" | "elite";
    ownership?: HorseOwnership;
    hemisphere?: Hemisphere;
    age?: number;
    gender?: HorseGender;
  } = {},
  rng: Rng = nondeterministicRng(),
  namingContext?: Partial<NamingContext>,
): Horse {
  const tier = opts.tier ?? "budget";
  const genotype = generateGenotype(rng, tier);
  const age = opts.age ?? (rng.next() < 0.2 ? rng.range(2, 3) : rng.range(2, 6));
  const gender = opts.gender ?? rollGender(rng);
  const hemisphere: Hemisphere = opts.hemisphere ?? (rng.next() < 0.5 ? "Northern" : "Southern");

  // Naming logic...
  const existingNames = namingContext?.existingNames ?? new Set<string>();
  const horseName = generateProceduralHorseName(
    { region: namingContext?.region, namingTheme: namingContext?.namingTheme, existingNames },
    rng,
    { strategy: "regional" },
  );

  const horse = createHorseFromDNA(genotype, rng, {
    name: horseName,
    age,
    gender,
    hemisphere,
    ownership: opts.ownership,
  });

  // Assign Bruce Lowe family for procedural horses
  horse.bruceLoweFamily = rollProceduralFamily(rng);

  return horse;
}

/**
 * Generates a horse specifically for an NPC stable, incorporating stable personality and tier preferences.
 *
 * @param {Stable} stable - The stable that will own the horse.
 * @param {Rng} rng - Seeded random number generator.
 * @param {NpcAIManager} [npcAIManager] - AI manager for advanced logic.
 * @param {number} [currentDay] - Current simulation day.
 * @param {Object} [opts={}] - Generation overrides.
 * @param {StableTier} [opts.tier] - Override quality tier.
 * @param {number} [opts.forcedAge] - Fixed age for the horse.
 * @param {Horse["gender"]} [opts.forcedGender] - Fixed gender for the horse.
 * @param {string} [opts.forcedName] - Fixed name for the horse.
 * @param {Hemisphere} [opts.hemisphere] - Racing hemisphere.
 * @param namingContext
 * @returns {Horse} An NPC-owned Horse object.
 */
export function generateNpcHorse(
  stable: Stable,
  rng: Rng,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
  opts: {
    tier?: StableTier;
    forcedAge?: number;
    forcedGender?: Horse["gender"];
    forcedName?: string;
    hemisphere?: Hemisphere;
  } = {},
  namingContext?: Partial<NamingContext>,
): Horse {
  const tier = opts.tier ?? stable.tier;
  const genTier = tier === "elite" ? "elite" : tier === "mid" ? "mid" : "budget";

  // Personality config
  const config = stable.personality
    ? PERSONALITY_CONFIG[stable.personality] || PERSONALITY_CONFIG.conservative
    : PERSONALITY_CONFIG.conservative;
  const region = getRegionalSystem(stable.country ?? "USA");

  const age = opts.forcedAge ?? (rng.next() < 0.3 ? 2 : rng.range(3, 6));
  const gender = opts.forcedGender ?? rollGender(rng);

  const genotype = generateGenotype(rng, genTier);

  const horse = createHorseFromDNA(genotype, rng, {
    age,
    gender,
    ownership: makeNpcOwned(asNpcStableId(stable.id)),
    hemisphere: opts.hemisphere ?? "Northern",
  });

  const existingNames = namingContext?.existingNames ?? new Set<string>();
  const reservedNames = namingContext?.reservedNames;

  horse.name =
    opts.forcedName ??
    generateProceduralHorseName(
      { region, namingTheme: config.namingTheme, existingNames, reservedNames, currentDay },
      rng,
      { strategy: "regional" },
    );

  // Assign Bruce Lowe family for NPC horses
  horse.bruceLoweFamily = rollProceduralFamily(rng);

  return horse;
}
