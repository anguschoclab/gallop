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
} from "@/game/types";
import type { Rng } from "@/core/common/types";
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
import { generateProceduralHorseName, type NamingContext } from "@/core/horse/naming/nameGenerator";
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
  initialStandingFee,
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
  const gender = opts.gender ?? rollGender(age, rng);
  const hemisphere: Hemisphere = opts.hemisphere ?? (rng.next() < 0.5 ? "Northern" : "Southern");

  // Naming logic...
  const existingNames = namingContext?.existingNames ?? new Set<string>();
  const horseName = generateProceduralHorseName(
    { region: namingContext?.region, namingTheme: namingContext?.namingTheme, existingNames },
    rng,
    { strategy: "regional" },
  );

  return createHorseFromDNA(genotype, rng, {
    name: horseName,
    age,
    gender,
    hemisphere,
    owned: opts.owned,
  });
}

/**
 * Personality-driven generation for NPC stables
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
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((PERSONALITY_CONFIG as any)[stable.personality] || PERSONALITY_CONFIG.conservative)
    : PERSONALITY_CONFIG.conservative;
  const region = stable.country
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getRegionalSystem((stable.country ?? "Belmont") as any)
    : "north_america";

  const age = opts.forcedAge ?? (rng.next() < 0.3 ? 2 : rng.range(3, 6));
  const gender = opts.forcedGender ?? rollGender(age, rng);

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

  return horse;
}

/**
 * Breeding resolution: resolves pregnancy into foal or complication
 */
export function resolveFoaling(
  pregnancy: Pregnancy,
  sire: Horse,
  dam: Horse,
  namingContext?: Partial<NamingContext>,
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
  });

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
