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
import { generateUUID } from "@/core/common/uuid";
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
import { generateProceduralHorseName, type NamingContext } from "@/core/horse/naming/nameGenerator.ts";
import {
  resolveBloodline,
  computeCoiFromSnapshot,
  computeAhc,
  computeGenomeModifiers,
} from "@/core/breeding/populationGenetics";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { getRegionalSystem } from "@/core/race/naming/raceNameGenerator";
import {
  shouldRetireAtStartup,
  defaultStudParams,
} from "@/core/breeding/stallions";
import {
  shouldGenerateHorseOfAge,
  createHorseGenAIState,
  recordHorseGeneration,
} from "@/core/ai/horseGenAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { activeStallions2020s, type PedigreeHorse } from "@/core/data/pedigreeData";
import { clamp } from "@/game/math";

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
 * Low-level builder: DNA -> Fully hydrated Horse object
 *
 * This function takes a genotype and resolves all phenotype traits (stats, coat color,
 * running style, aptitudes, health risks, etc.) to create a complete Horse object.
 * It's the core horse creation primitive used by all other generation functions.
 *
 * @param genotype - The genetic blueprint containing all DNA information
 * @param rng - Random number generator for deterministic variation
 * @param opts - Configuration options for the horse
 * @param opts.name - Optional horse name (defaults to "Unnamed")
 * @param opts.age - Optional horse age in years (defaults to 2)
 * @param opts.gender - Optional horse gender (defaults to "colt")
 * @param opts.hemisphere - Optional racing hemisphere (defaults to "Northern")
 * @param opts.owned - Optional ownership flag (defaults to false)
 * @param opts.stableId - Optional stable ID assignment
 * @param opts.createdAtDay - Optional game day when horse was created
 * @returns Fully hydrated Horse object with all phenotype traits resolved
 *
 * @example
 * const genotype = generateGenotype(rng, "elite");
 * const horse = createHorseFromDNA(genotype, rng, { name: "Thunder", age: 3 });
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

  const sizeSum = genotype.size[0] + genotype.size[1];
  if (sizeSum >= 8) corneringAptitude -= 0.15;
  if (sizeSum <= 4) corneringAptitude += 0.1;

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
    potential: 50 + Math.floor(rng.next() * 40), // 50-90 base
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
    lifecycleStatus: "active",
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
 * Procedural generation for market/starter horses
 *
 * Generates a complete horse with genotype, phenotype, and name. This is the primary
 * function for creating horses for the market, starter stables, or other procedural
 * generation needs. It uses tier-based generation to control quality distribution.
 *
 * @param opts - Generation options
 * @param opts.tier - Quality tier affecting stat ranges (defaults to "budget")
 * @param opts.owned - Whether the horse is player-owned (defaults to false)
 * @param opts.hemisphere - Racing hemisphere (defaults to random)
 * @param opts.age - Horse age in years (defaults to 2-5 random)
 * @param opts.gender - Horse gender (defaults to age-appropriate random)
 * @param rng - Random number generator (defaults to nondeterministic)
 * @param namingContext - Context for name generation (region, theme, existing names)
 * @returns Fully generated Horse object with name, stats, and appearance
 *
 * @example
 * const horse = generateHorse({ tier: "elite", owned: true });
 * const budgetHorse = generateHorse({ tier: "budget" });
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
 * Personality-driven generation for NPC stables
 *
 * Generates a horse tailored to an NPC stable's personality and tier. The stable's
 * personality influences naming themes and quality preferences. This function is used
 * during world generation and daily NPC horse production.
 *
 * @param stable - The NPC stable generating the horse (provides tier, personality, country)
 * @param rng - Random number generator for deterministic variation
 * @param npcAIManager - Optional AI manager for advanced decision-making
 * @param currentDay - Optional current game day for age calculations
 * @param opts - Generation overrides
 * @param opts.tier - Override stable tier for generation (defaults to stable.tier)
 * @param opts.forcedAge - Force specific age instead of random
 * @param opts.forcedGender - Force specific gender instead of random
 * @param opts.forcedName - Force specific name instead of procedural generation
 * @param opts.hemisphere - Override hemisphere (defaults to "Northern")
 * @returns Generated Horse object assigned to the stable
 *
 * @example
 * const horse = generateNpcHorse(stable, rng, aiManager, currentDay, { forcedAge: 3 });
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
  const ageRisk = Math.max(0, (dam.age - 10) * 0.02); // 2% per year over 10
  const baseRoll = rng.next();
  if (baseRoll < 0.01 + ageRisk) {
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
      if (rng.next() < 0.25) {
        // 25% chance for homozygous lethal
        return { kind: "complication", type: "lethal recessive" };
      }
    }
  }

  // 3. Rare random complication
  if (rng.next() < 0.005) {
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
    sireId: sire.id,
    damId: dam.id,
    sireName: sire.name,
    damName: dam.name,
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

  return { kind: "live", foal };
}
