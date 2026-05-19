/**
 * horseFactory.ts - Horse creation and foaling
 *
 * This file provides functions for creating horses from genetics, resolving
 * phenotypes, and handling pregnancy outcomes including live foals and complications.
 *
 * Dependencies: @/game/types (Horse, Genotype, HorseGender, Hemisphere, Pregnancy, Pedigree, HorseStats, CoatColor, RunningStyle, Stable, StableTier), @/core/common/types (Rng), @/game/rng (createRng, hashStr, nondeterministicRng), @/core/common/uuid (generateUUID), ./proceduralPortrait (generateAppearanceDNA, getPalette), @/core/genetics/generation (generateGenotype, generateDeterministicGenotype, generateResearchBasedGenotype), @/core/genetics/phenotype (various resolve functions), @/core/breeding/bruceLowe (resolveBruceLoweFamily), @/core/breeding/populationGenetics (resolveBloodline, getGenomeModifiers), @/core/breeding/eligibility (canBreed), @/game/constants/gameConstants (various constants)
 * Related files: Used throughout game initialization and breeding systems
 */

import type {
  Horse,
  Genotype,
  HorseGender,
  Hemisphere,
  Pregnancy,
  Pedigree,
  HorseStats,
  CoatColor,
  RunningStyle,
  Stable,
  StableTier,
  GameState,
} from "@/game/types";
import type { Rng } from "@/core/common/types";

/**
 * Represents the outcome of a foaling event.
 *
 * Can be a live foal with associated metadata or a complication
 * describing why the foaling failed or resulted in a non-standard outcome.
 */
export type FoalOutcome =
  | { kind: "live"; foal: Horse; transmission: boolean }
  | { kind: "complication"; type: "stillborn" | "twins" | "injury"; foal?: Horse };
import { createRng, hashStr, nondeterministicRng } from "@/game/rng";
import { generateUUID } from "@/core/uuid";
import { generateAppearanceDNA, getPalette } from "@/core/horse/proceduralPortrait";
import {
  generateGenotype,
  generateDeterministicGenotype,
  generateResearchBasedGenotype,
} from "@/core/genetics/generation";
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
import { inheritDNA } from "@/core/genetics/inheritance";
import {
  rollProceduralFamily,
  RUNNING_FAMILIES,
  SIRE_FAMILIES,
  resolveBruceLoweFamily,
} from "@/core/breeding/bruceLowe";
import { rollGender, geldHorse } from "@/core/horse/gender";
import { randomSilk, rand } from "@/core/common/random";
import {
  generateProceduralHorseName,
  type NamingContext,
} from "@/core/horse/naming/nameGenerator.ts";
import {
  resolveBloodline,
  computeCoiFromSnapshot,
  computeAhc,
  computeGenomeModifiers,
} from "@/core/breeding/populationGenetics";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { getRegionalSystem } from "@/core/race/naming/raceNameGenerator";
import { shouldRetireAtStartup, defaultStudParams } from "@/core/breeding/stallions";
import {
  shouldGenerateHorseOfAge,
  createHorseGenAIState,
  recordHorseGeneration,
} from "@/core/ai/horseGenAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { activeStallions2020s, type PedigreeHorse } from "@/core/data/pedigreeData";
import { clamp } from "@/game/math";
import {
  POTENTIAL_MIN,
  POTENTIAL_MAX,
  CORNERING_APTITUDE_SIZE_LARGE_THRESHOLD,
  CORNERING_APTITUDE_LARGE_PENALTY,
  CORNERING_APTITUDE_SIZE_SMALL_THRESHOLD,
  CORNERING_APTITUDE_SMALL_BONUS,
  FOALING_AGE_RISK_THRESHOLD,
  FOALING_AGE_RISK_MULTIPLIER,
  FOALING_BASE_COMPLICATION_RATE,
  LETHAL_RECESSIVE_CHANCE,
  TWIN_REDUCTION_CHANCE,
} from "@/game/constants/gameConstants";

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

// --- Public Factory API ---


/**
 * Hydrates a complete Horse object from a given genotype by resolving all phenotype traits.
 * This is the core builder for all horse creation, handling stats, aptitudes, health risks, and appearance.
 * 
 * @param {Genotype} genotype - The genetic blueprint for the horse.
 * @param {Rng} rng - Seeded random number generator.
 * @param {Object} [opts={}] - Configuration options.
 * @param {string} [opts.name] - The horse's name.
 * @param {number} [opts.age] - Current age in years.
 * @param {HorseGender} [opts.gender] - Biological gender.
 * @param {Hemisphere} [opts.hemisphere] - Racing hemisphere.
 * @param {boolean} [opts.owned] - Player ownership status.
 * @param {string} [opts.stableId] - ID of the assigned stable.
 * @param {number} [opts.createdAtDay] - Simulation day of creation.
 * @returns {Horse} A fully populated Horse object.
 */
export function createHorseFromDNA(
  genotype: Genotype,
  rng: Rng,
  opts: {
    name?: string;
    age?: number;
    gender?: HorseGender;
    hemisphere?: Hemisphere;
    owned?: boolean;
    stableId?: string;
    createdAtDay?: number;
  } = {},
): Horse {
  const confTrait = resolveTrait(genotype.physical);
  const tempTrait = resolveTrait(genotype.mental);
  const conformation = TRAIT_VALUES[confTrait] * 25;
  const temperament = TRAIT_VALUES[tempTrait] * 25;

  const stats = resolveStats(genotype.stats, conformation, temperament);
  const coatColor = resolveCoatColor(genotype.color);
  const runningStyle = resolveRunningStyle(genotype.style);

  const distanceAptitude = resolveDistanceAptitude(genotype.preferences.distance);
  const surfaceAptitude = resolveSurfaceAptitude(genotype.preferences.surface);
  const climbingAptitude = resolveAptitudeMultiplier(genotype.preferences.climbing);
  let corneringAptitude = resolveAptitudeMultiplier(genotype.preferences.cornering);
  const injuryProneness = resolveInjuryProneness(genotype.durability);
  const { height, weight } = resolveSize(genotype.size);

  const sizeSum = genotype.size[0] + genotype.size[1];
  if (sizeSum >= CORNERING_APTITUDE_SIZE_LARGE_THRESHOLD) corneringAptitude -= CORNERING_APTITUDE_LARGE_PENALTY;
  if (sizeSum <= CORNERING_APTITUDE_SIZE_SMALL_THRESHOLD) corneringAptitude += CORNERING_APTITUDE_SMALL_BONUS;

  const dnaTraits = resolveDnaTraits(genotype);

  const horse: Horse = {
    id: generateUUID(rng),
    name: opts.name ?? "Unnamed",
    age: opts.age ?? 2,
    gender: opts.gender ?? "colt",
    hemisphere: opts.hemisphere ?? "Northern",
    silk: randomSilk(rng),
    stats,
    genotype,
    energy: 100,
    form: 50,
    potential: POTENTIAL_MIN + Math.floor(rng.next() * (POTENTIAL_MAX - POTENTIAL_MIN)), // 50-90 base
    fame: 0,
    raceHistory: [],
    owned: opts.owned ?? false,
    stableId: opts.stableId,
    conformation,
    temperament,
    geneticMarkers: resolveGeneticMarkers(genotype),
    coatColor,
    runningStyle,
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
    healthStatus: resolveHealthStatus(genotype.health),
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
    ...dnaTraits,
    recoveryPoints: 100, // Dynamic Form: Initialize at full recovery
    createdAtDay: opts.createdAtDay,
    appearance: generateAppearanceDNA(
      Math.floor(rng.next() * 2147483647),
      undefined,
      getPalette(coatColor),
    ),
  };

  return horse as Horse;
}

/**
 * Generates a procedural horse, typically for use in market listings or starter rosters.
 * Handles genotype generation based on tier, age rolling, and procedural naming.
 * 
 * @param {Object} [opts={}] - Generation options.
 * @param {"starter" | "budget" | "mid" | "elite"} [opts.tier] - Quality tier for genotype generation.
 * @param {boolean} [opts.owned] - Player ownership status.
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
    owned?: boolean;
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
    owned: opts.owned,
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
    stableId: stable.id,
    hemisphere: opts.hemisphere ?? "Northern",
  });

  horse.name =
    opts.forcedName ??
    generateProceduralHorseName(
      { region, namingTheme: config.namingTheme, existingNames: new Set() },
      rng,
      { strategy: "regional" },
    );

  // Assign Bruce Lowe family for NPC horses
  horse.bruceLoweFamily = rollProceduralFamily(rng);

  return horse;
}

/**
 * Breeding resolution: resolves pregnancy into foal or complication
 *
 * This function handles the foaling process, including genetic inheritance from
 * sire and dam, complication checks (age-based risks, lethal recessives, rare events),
 * and foal creation. It uses a deterministic RNG seeded by the pregnancy ID for
 * consistent results.
 *
 * @param pregnancy - The pregnancy record to resolve
 * @param sire - The sire horse (must have genotype)
 * @param dam - The dam horse (must have genotype)
 * @param namingContext - Optional context for name generation (region, theme, existing names)
 * @param newDay - Optional game day when foaling occurs
 * @param state - Optional game state with horses array for Bruce Lowe family resolution
 * @returns Either a live foal with Horse object, or a complication with type description
 * @throws {Error} If sire or dam is missing genotype
 *
 * @example
 * const result = resolveFoaling(pregnancy, sire, dam, namingContext, currentDay, state);
 * if (result.kind === "live") {
 *   console.log("Foal born:", result.foal.name);
 * } else {
 *   console.log("Complication:", result.type);
 * }
 */
export function resolveFoaling(
  pregnancy: Pregnancy,
  sire: Horse,
  dam: Horse,
  namingContext?: Partial<NamingContext>,
  newDay?: number,
  state?: Pick<GameState, "horses">,
): { kind: "live"; foal: Horse; transmission?: boolean } | { kind: "complication"; type: string } {
  const rng = createRng(hashStr(pregnancy.id));

  // Genetic crossover
  if (!sire.genotype || !dam.genotype) {
    throw new Error(
      `Cannot resolve foaling: missing genotype for ${!sire.genotype ? "sire" : "dam"}`,
    );
  }

  // --- Complication Checks ---

  // 1. Age-based risk
  const ageRisk = Math.max(0, (dam.age - FOALING_AGE_RISK_THRESHOLD) * FOALING_AGE_RISK_MULTIPLIER);
  const baseRoll = rng.next();
  if (baseRoll < FOALING_BASE_COMPLICATION_RATE + ageRisk) {
    const types = ["stillborn", "unable to stand", "early loss", "mid loss"];
    return { kind: "complication", type: types[Math.floor(rng.next() * types.length)] };
  }

  // 2. Lethal recessive check
  const sMarkers = sire.geneticMarkers?.lethalCarriers;
  const dMarkers = dam.geneticMarkers?.lethalCarriers;
  if (sMarkers && dMarkers) {
    if (
      (sMarkers.csnb && dMarkers.csnb) ||
      (sMarkers.hypp && dMarkers.hypp) ||
      (sMarkers.olws && dMarkers.olws)
    ) {
      if (rng.next() < LETHAL_RECESSIVE_CHANCE) {
        // 25% chance for homozygous lethal
        return { kind: "complication", type: "lethal recessive" };
      }
    }
  }

  // 3. Rare random complication
  if (rng.next() < TWIN_REDUCTION_CHANCE) {
    return { kind: "complication", type: "twin reduction (single survivor)" };
  }

  const genotype = inheritDNA(sire.genotype, dam.genotype, rng);

  const foal = createHorseFromDNA(genotype, rng, {
    age: 0,
    gender: rng.next() < 0.5 ? "colt" : "filly",
    owned: dam.owned,
    stableId: dam.stableId,
    createdAtDay: newDay,
  });

  // Set pedigree
  foal.pedigree = {
    horseId: foal.id,
    name: "Foal",
    generation: 0,
    sireId: sire.id,
    damId: dam.id,
    sireName: sire.name,
    damName: dam.name,
    sirePedigree: sire.pedigree,
    damPedigree: dam.pedigree,
  };

  // Resolve Bruce Lowe family from dam line
  if (state) {
    foal.bruceLoweFamily = resolveBruceLoweFamily(foal, state);
  } else {
    // Fallback: use dam's family if available, otherwise roll procedural
    foal.bruceLoweFamily = dam.bruceLoweFamily ?? rollProceduralFamily(rng);
  }

  foal.name = generateProceduralHorseName(
    {
      sireName: sire.name,
      damName: dam.name,
      region: namingContext?.region,
      namingTheme: namingContext?.namingTheme,
      existingNames: namingContext?.existingNames ?? new Set(),
    },
    rng,
    { strategy: "hybrid" },
  );

  foal.pedigree.name = foal.name;

  return { kind: "live", foal };
}
