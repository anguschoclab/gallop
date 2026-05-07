// NPC Horse Generation - DNA-backed with tier-based quality and realistic age distribution
// Age distribution: 30% 2YO, 40% 3-4YO (prime), 20% 5-6YO, 10% 7YO+ (breeding stock)

import type { Horse, HorseGender, Hemisphere, Stable, StableTier } from "./types";
import type { Rng } from "./rng";
import { createHorseFromDNA } from "./horseGen";
import { generateGenotype, generateDeterministicGenotype, generateResearchBasedGenotype } from "./geneticsEngine";
import { rand, randomHorseName } from "@/core/common/random";
import { generateProceduralHorseName } from "@/core/horse/naming/nameGenerator";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { getRegionalSystem } from "@/core/race/naming/raceNameGenerator";
import {
  shouldRetireAtStartup,
  initialStandingFee,
  defaultStudParams,
} from "@/core/breeding/stallions";
import {
  rollProceduralFamily,
  RUNNING_FAMILIES,
  SIRE_FAMILIES,
  resolveBruceLoweFamily,
} from "@/core/breeding/bruceLowe";
import { rollGender } from "@/core/horse/gender";
import { resolveBloodline } from "@/core/breeding/populationGenetics";
import {
  shouldGenerateHorseOfAge,
  createHorseGenAIState,
  recordHorseGeneration,
} from "@/core/ai/horseGenAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { activeStallions2020s, type PedigreeHorse } from "./pedigreeData";
import { mapStallionToStable } from "./npcStables";

/**
 * Map stable tier to DNA generation tier.
 * Elite stables produce elite-tier DNA; budget stables produce budget-tier.
 */
function dnaGenTier(stableTier: StableTier): "starter" | "budget" | "mid" | "elite" {
  return stableTier; // 1:1 mapping
}

/**
 * Determine age category based on realistic racing distribution
 * Returns: 2YO prospect, 3-4YO prime, 5-6YO veteran, 7YO+ breeding stock
 */
function rollAgeCategory(rng: Rng): "2yo" | "prime" | "veteran" | "breeding" {
  const r = rng.next();
  if (r < 0.3) return "2yo"; // 30% - young prospects
  if (r < 0.7) return "prime"; // 40% - prime racing age
  if (r < 0.9) return "veteran"; // 20% - veteran campaigners
  return "breeding"; // 10% - breeding stock
}

/**
 * Get specific age within category
 */
function getAgeFromCategory(category: "2yo" | "prime" | "veteran" | "breeding", rng: Rng): number {
  switch (category) {
    case "2yo":
      return 2;
    case "prime":
      return rng.next() < 0.5 ? 3 : 4;
    case "veteran":
      return rng.next() < 0.5 ? 5 : 6;
    case "breeding":
      return rand(7, 10, rng);
  }
}

/**
 * Calculate starting fame based on tier and age
 */
function calculateStartingFame(tier: StableTier, age: number, rng: Rng): number {
  let baseFame = 0;

  // Elite stables start with more famous horses
  switch (tier) {
    case "elite":
      baseFame = rand(20, 40, rng);
      break;
    case "mid":
      baseFame = rand(10, 25, rng);
      break;
    case "budget":
      baseFame = rand(0, 15, rng);
      break;
  }

  // Older horses have had more time to become famous
  const ageBonus = (age - 2) * 3;

  return Math.min(100, baseFame + ageBonus);
}

/**
 * Generate a single NPC horse for a stable.
 * Uses the DNA pipeline (generateGenotype → createHorseFromDNA) so NPC horses
 * have full DNA, aptitudes, and all required Horse fields — identical in
 * structure to player/market horses.
 */
export function generateNpcHorse(
  stableId: string,
  tier: StableTier,
  rng: Rng,
  usedNames: Set<string>,
  stablePersonality: string,
  country: string,
  specificAge?: number,
  specificGender?: HorseGender,
  hemisphere?: Hemisphere,
): Horse {
  // Determine age
  const ageCategory = specificAge ? null : rollAgeCategory(rng);
  const age = specificAge ?? getAgeFromCategory(ageCategory!, rng);

  // Determine gender via shared canonical function
  const gender = specificGender ?? rollGender(age, rng);

  // Generate full DNA-backed horse
  const genotype = generateGenotype(rng, dnaGenTier(tier));
  const resolvedHemisphere: Hemisphere = hemisphere ?? (rng.next() < 0.5 ? "Northern" : "Southern");

  // Resolve bloodline from procedural sire/dam names
  const region = getRegionalSystem(country);
  const namingTheme = (PERSONALITY_CONFIG as any)[stablePersonality]?.namingTheme;

  const proceduralSireName = generateProceduralHorseName(
    { region, namingTheme, existingNames: usedNames },
    rng,
    { strategy: "regional" }
  );
  usedNames.add(proceduralSireName.toLowerCase());

  const proceduralDamName = generateProceduralHorseName(
    { region, namingTheme, existingNames: usedNames },
    rng,
    { strategy: "regional" }
  );
  usedNames.add(proceduralDamName.toLowerCase());

  const horseName = generateProceduralHorseName(
    { 
      region, 
      namingTheme, 
      sireName: proceduralSireName, 
      damName: proceduralDamName, 
      existingNames: usedNames 
    },
    rng,
    { strategy: "hybrid" }
  );
  usedNames.add(horseName.toLowerCase());

  const horse = createHorseFromDNA(genotype, rng, {
    name: horseName,
    age,
    gender,
    hemisphere: resolvedHemisphere,
    owned: false,
  });

  // Layer NPC-specific metadata on top of DNA-generated base
  const bruceLoweFamily = rollProceduralFamily(rng);

  // Sire family potential boost for males
  let potentialBoost = 0;

  // Resolve bloodline from procedural sire/dam names
  const bloodline = resolveBloodline(
    { name: proceduralSireName, sireName: proceduralSireName } as Horse,
    { horses: [] },
  );
  if (SIRE_FAMILIES.has(bruceLoweFamily) && (gender === "colt" || gender === "horse")) {
    potentialBoost = 2;
  }
  if (RUNNING_FAMILIES.has(bruceLoweFamily)) {
    potentialBoost += 1;
  }

  return {
    ...horse,
    stableId,
    sireName: proceduralSireName,
    damName: proceduralDamName,
    fame: calculateStartingFame(tier, age, rng),
    bruceLoweFamily,
    bloodline,
    potential: Math.min(100, horse.potential + potentialBoost),
    // NPC horses are never owned by player
    owned: false,
  };
}

/**
 * Generate a full stable of horses
 */
export function generateStableHorses(
  stable: Stable,
  rng: Rng,
  usedNames: Set<string>,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
): Horse[] {
  const horses: Horse[] = [];

  // Initialize AI state if available
  let aiState;
  if (npcAIManager && currentDay !== undefined) {
    aiState = npcAIManager.stableStates.get(stable.id);
    if (aiState && !aiState.horseGenAI) {
      aiState.horseGenAI = createHorseGenAIState(stable);
    }
  }

  // Determine target count based on tier
  let targetCount: number;
  if (!stable.isMajor) {
    targetCount = 10; // Filler stables
  } else {
    switch (stable.tier) {
      case "elite":
        targetCount = rand(30, 40, rng);
        break;
      case "mid":
        targetCount = rand(20, 30, rng);
        break;
      case "budget":
        targetCount = rand(15, 25, rng);
        break;
    }
  }

  // Generate horses with AI-driven age distribution
  const ageCategories = {
    "2yo": 0,
    prime: 0,
    veteran: 0,
    breeding: 0,
  };

  // Use AI to determine age distribution if available
  if (aiState?.horseGenAI) {
    for (let age = 2; age <= 10; age++) {
      if (shouldGenerateHorseOfAge(aiState.horseGenAI, age, stable)) {
        if (age === 2) ageCategories["2yo"]++;
        else if (age <= 4) ageCategories.prime++;
        else if (age <= 6) ageCategories.veteran++;
        else ageCategories.breeding++;
      }
    }

    // Ensure we have at least some horses
    const totalAIGenerated = Object.values(ageCategories).reduce((a, b) => a + b, 0);
    if (totalAIGenerated < targetCount) {
      // Fill remaining with prime horses
      ageCategories.prime += targetCount - totalAIGenerated;
    } else if (totalAIGenerated > targetCount) {
      // Trim down to target count
      const excess = totalAIGenerated - targetCount;
      ageCategories.prime = Math.max(0, ageCategories.prime - excess);
    }
  } else {
    // Fallback to default distribution
    ageCategories["2yo"] = Math.floor(targetCount * 0.3);
    ageCategories.prime = Math.floor(targetCount * 0.4);
    ageCategories.veteran = Math.floor(targetCount * 0.2);
    ageCategories.breeding = Math.floor(targetCount * 0.1);

    // Fill remaining from prime (most common)
    const totalAssigned = Object.values(ageCategories).reduce((a, b) => a + b, 0);
    ageCategories.prime += targetCount - totalAssigned;
  }

  // Generate horses for each category
  for (const [category, count] of Object.entries(ageCategories)) {
    for (let i = 0; i < count; i++) {
      const age = getAgeFromCategory(category as "2yo" | "prime" | "veteran" | "breeding", rng);
      const horse = generateNpcHorse(
        stable.id,
        stable.tier,
        rng,
        usedNames,
        stable.personality,
        stable.country || "USA",
        age
      );

      // Record generation for AI learning
      if (aiState?.horseGenAI && currentDay !== undefined) {
        recordHorseGeneration(aiState.horseGenAI, horse, stable, currentDay);
      }

      horses.push(horse);
    }
  }

  return horses;
}

/**
 * Generate horses for all stables
 * Returns both the updated stables and all generated horses.
 * Retires eligible stallions to stud at world-gen time so the player has
 * a roster to book against from day 1 (instead of waiting for in-game
 * retirements to seed the stallion market).
 *
 * If famousStallions is provided, they are integrated into the stables and
 * procedural stallion generation is skipped for those stables.
 */
export function generateAllNpcHorses(
  stables: Stable[],
  rng: Rng,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
  famousStallions?: Horse[],
): { stables: Stable[]; horses: Horse[]; usedNames: Set<string> } {
  const updatedStables: Stable[] = [];
  const allHorses: Horse[] = [];
  const usedNames = new Set<string>();

  // Group famous stallions by stable
  const stallionsByStable = new Map<string, Horse[]>();
  if (famousStallions) {
    for (const stallion of famousStallions) {
      usedNames.add(stallion.name.toLowerCase());
      if (stallion.stableId) {
        if (!stallionsByStable.has(stallion.stableId)) {
          stallionsByStable.set(stallion.stableId, []);
        }
        stallionsByStable.get(stallion.stableId)!.push(stallion);
      }
      allHorses.push(stallion);
    }
  }

  for (const stable of stables) {
    const stableFamousStallions = stallionsByStable.get(stable.id) || [];

    // Generate procedural horses
    const horses = generateStableHorses(stable, rng, usedNames, npcAIManager, currentDay);

    // Add famous stallions to this stable's horses
    horses.push(...stableFamousStallions);

    // Retire eligible procedural horses to stud (famous stallions already have stud careers)
    for (const horse of horses) {
      // Skip famous stallions - they already have stud careers
      if (famousStallions && famousStallions.some((fs) => fs.id === horse.id)) {
        continue;
      }

      if (shouldRetireAtStartup(horse, stable)) {
        const { bookSize } = defaultStudParams(stable.tier);
        horse.stud = {
          atStud: true,
          standingFee: initialStandingFee(horse, stable.tier),
          bookSize,
          seasonBookings: 0,
          lifetimeFoals: 0,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
          retiredOnDay: 1,
        };
      }
    }

    const horseIds = horses.map((h) => h.id);

    updatedStables.push({
      ...stable,
      horses: horseIds,
    });

    allHorses.push(...horses);
  }

  return { stables: updatedStables, horses: allHorses, usedNames };
}

/**
 * Calculate horse price based on tier and stats (for breeding fees)
 */
export function calculateNpcHorseValue(horse: Horse, stableTier: StableTier): number {
  const overall =
    (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) /
    4;
  const ageMod = horse.age <= 3 ? 1.3 : horse.age >= 7 ? 0.5 : 0.9;
  const fameMod = 1 + horse.fame / 200; // Up to 50% bonus for fame
  const tierMod = stableTier === "elite" ? 1.5 : stableTier === "mid" ? 1.2 : 1.0;

  // Stud fee formula (for breeding)
  const baseValue = overall * 100 * ageMod * fameMod * tierMod;
  return Math.round(baseValue / 100) * 100; // Round to nearest 100
}

/**
 * Get stud fee for an NPC stallion
 */
export function getStudFee(horse: Horse, stable: Stable): number {
  if (horse.gender !== "horse" && horse.gender !== "colt") {
    return 0; // Only stallions have stud fees
  }

  // Must be 4+ years old to stand at stud
  if (horse.age < 4) {
    return 0;
  }

  return calculateNpcHorseValue(horse, stable.tier);
}

/**
 * Get broodmare fee for an NPC mare (if offering breeding rights)
 */
export function getBroodmareFee(horse: Horse, stable: Stable): number {
  if (horse.gender !== "mare" && horse.gender !== "filly") {
    return 0;
  }

  // Mares can breed from age 3+
  if (horse.age < 3) {
    return 0;
  }

  return Math.round(calculateNpcHorseValue(horse, stable.tier) * 0.3); // Mare fees lower
}

/**
 * Generate famous stallions from the activeStallions2020s dataset
 * These replace procedural stallion generation with real-world sires
 */
export function generateFamousStallions(stables: Stable[], rng: Rng): Horse[] {
  const famousStallions: Horse[] = [];

  // Filter for active stallions
  const activeStallions = activeStallions2020s.filter((s) => s.currentStatus === "active");

  for (const stallionData of activeStallions) {
    // Map to appropriate stable
    const stable = mapStallionToStable(stallionData, stables);

    // Calculate age from birth year (game starts in 2026)
    const age = 2026 - (stallionData.birthYear || 2020);

    // Determine DNA tier based on stud fee
    const tier =
      stallionData.studFee && stallionData.studFee >= 100000
        ? "elite"
        : stallionData.studFee && stallionData.studFee >= 25000
        ? "mid"
        : "budget";

    // Generate research-based DNA with deterministic fallback
    // Uses manually researched data if available, otherwise deterministic generation
    // Applies dosage-based biases and achievement-based bonuses
    const genotype = generateResearchBasedGenotype(
      stallionData.name,
      tier,
      stallionData.dosageGroups,
      stallionData.achievements,
    );

    // Create horse from DNA
    const horse = createHorseFromDNA(genotype, rng, {
      name: stallionData.name,
      age,
      gender: "horse",
      hemisphere: stallionData.hemisphere || "Northern",
      owned: false,
    });

    // Set pedigree
    horse.sireName = stallionData.sire;
    horse.damName = stallionData.dam;

    // Set stud career with real-world fee
    horse.stud = {
      atStud: true,
      standingFee: stallionData.studFee || 50000,
      bookSize: stallionData.bookSize || 150,
      seasonBookings: 0,
      lifetimeFoals: 0,
      lifetimeStakesFoals: 0,
      lifetimeG1Foals: 0,
      retiredOnDay: 1,
    };

    // Assign to stable
    horse.stableId = stable.id;

    // Set bloodline from pedigreeData
    horse.bloodline = resolveBloodline(horse, { horses: [] });

    // Set Bruce Lowe family if available
    if (stallionData.bruceLoweFamily) {
      horse.bruceLoweFamily = stallionData.bruceLoweFamily;
    } else {
      // Fallback to procedural family
      horse.bruceLoweFamily = rollProceduralFamily(rng);
    }

    // Set fame based on achievements and stud fee
    let baseFame = 30;
    if (stallionData.studFee && stallionData.studFee >= 200000) baseFame = 70;
    else if (stallionData.studFee && stallionData.studFee >= 100000) baseFame = 50;
    horse.fame = Math.min(100, baseFame + (age - 4) * 2);

    famousStallions.push(horse);
  }

  return famousStallions;
}
