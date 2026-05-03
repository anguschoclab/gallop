// NPC Horse Generation - Tier-based quality with realistic age distribution
// Age distribution: 30% 2YO, 40% 3-4YO (prime), 20% 5-6YO, 10% 7YO+ (breeding stock)

import type { Horse, HorseGender, Hemisphere, Stable, StableTier } from "./types";
import { randomHorseName, randomSilk } from "./names";
import { generateUUID } from "./uuid";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randConformation(): Horse["conformation"] {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

function randTemperament(): Horse["temperament"] {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

function randGeneticQuality(): "excellent" | "good" | "fair" | "poor" {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

function generateGeneticMarkers() {
  return {
    sensoryPerception: randGeneticQuality(),
    signalTransduction: randGeneticQuality(),
    immunity: randGeneticQuality(),
    geneticDiversity: Math.random() * 0.5 + 0.5,
  };
}

function randomCoatColor(): Horse["coatColor"] {
  const colors: Horse["coatColor"][] = ["bay", "black", "chestnut", "dark-bay", "gray", "roan", "palomino", "white"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function rollRunningStyle(stats: { speed: number; stamina: number; acceleration: number }): Horse["runningStyle"] {
  const earlyBias = (stats.speed + stats.acceleration) / 2;
  const lateBias = stats.stamina;
  const tilt = earlyBias - lateBias;
  const r = Math.random() * 100 - tilt;
  if (r < 25) return "front-runner";
  if (r < 55) return "stalker";
  if (r < 80) return "mid-pack";
  return "closer";
}

/**
 * Get tier-based stat ranges
 */
function getTierRanges(tier: StableTier): { statRange: [number, number]; potentialRange: [number, number] } {
  switch (tier) {
    case "elite":
      return { statRange: [55, 85], potentialRange: [80, 100] };
    case "mid":
      return { statRange: [40, 70], potentialRange: [70, 90] };
    case "budget":
      return { statRange: [25, 55], potentialRange: [60, 80] };
  }
}

/**
 * Determine age category based on realistic racing distribution
 * Returns: 2YO prospect, 3-4YO prime, 5-6YO veteran, 7YO+ breeding stock
 */
function rollAgeCategory(): "2yo" | "prime" | "veteran" | "breeding" {
  const r = Math.random();
  if (r < 0.30) return "2yo"; // 30% - young prospects
  if (r < 0.70) return "prime"; // 40% - prime racing age
  if (r < 0.90) return "veteran"; // 20% - veteran campaigners
  return "breeding"; // 10% - breeding stock
}

/**
 * Get specific age within category
 */
function getAgeFromCategory(category: "2yo" | "prime" | "veteran" | "breeding"): number {
  switch (category) {
    case "2yo": return 2;
    case "prime": return Math.random() < 0.5 ? 3 : 4;
    case "veteran": return Math.random() < 0.5 ? 5 : 6;
    case "breeding": return rand(7, 10);
  }
}

/**
 * Calculate starting fame based on tier and age
 */
function calculateStartingFame(tier: StableTier, age: number): number {
  let baseFame = 0;
  
  // Elite stables start with more famous horses
  switch (tier) {
    case "elite": baseFame = rand(20, 40); break;
    case "mid": baseFame = rand(10, 25); break;
    case "budget": baseFame = rand(0, 15); break;
  }
  
  // Older horses have had more time to become famous
  const ageBonus = (age - 2) * 3;
  
  return Math.min(100, baseFame + ageBonus);
}

/**
 * Generate gender with realistic racing distribution
 * Fillies/mares slightly less common in training stock (breeding considerations)
 */
function rollGender(age: number): HorseGender {
  const r = Math.random();
  // Slight bias toward males in racing stock
  const isMale = r < 0.55;
  
  if (age <= 2) {
    return isMale ? "colt" : "filly";
  }
  return isMale ? "horse" : "mare";
}

/**
 * Generate a single NPC horse for a stable
 */
export function generateNpcHorse(
  stableId: string,
  tier: StableTier,
  specificAge?: number,
  specificGender?: HorseGender,
  hemisphere?: Hemisphere
): Horse {
  const { statRange, potentialRange } = getTierRanges(tier);
  const [statMin, statMax] = statRange;
  const [potMin, potMax] = potentialRange;
  
  // Determine age
  const ageCategory = specificAge ? null : rollAgeCategory();
  const age = specificAge ?? getAgeFromCategory(ageCategory!);
  
  // Determine gender
  const gender = specificGender ?? rollGender(age);
  
  // Generate stats with slight bias based on tier quality
  const speed = rand(statMin, statMax);
  const stamina = rand(statMin, statMax);
  const acceleration = rand(statMin, statMax);
  const consistency = rand(statMin, statMax);
  
  const stats = { speed, stamina, acceleration, consistency };
  const runningStyle = rollRunningStyle(stats);
  
  // Use stable colors for silk
  const silk = randomSilk();
  
  return {
    id: generateUUID(),
    name: randomHorseName(),
    age,
    gender,
    hemisphere: hemisphere ?? (Math.random() < 0.5 ? "Northern" : "Southern"),
    silk,
    stats,
    energy: 100,
    form: 0,
    potential: rand(potMin, potMax),
    raceHistory: [],
    owned: false, // NPC horses are never owned by player
    sireName: randomHorseName(),
    damName: randomHorseName(),
    conformation: randConformation(),
    temperament: randTemperament(),
    geneticMarkers: generateGeneticMarkers(),
    healthStatus: "healthy",
    coatColor: randomCoatColor(),
    runningStyle,
    stableId,
    fame: calculateStartingFame(tier, age),
    // No scoutedStats initially - fog of war applies
  };
}

/**
 * Generate a full stable of horses
 */
export function generateStableHorses(stable: Stable): Horse[] {
  const horses: Horse[] = [];
  
  // Determine target count based on tier
  let targetCount: number;
  if (!stable.isMajor) {
    targetCount = 10; // Filler stables
  } else {
    switch (stable.tier) {
      case "elite": targetCount = rand(30, 40); break;
      case "mid": targetCount = rand(20, 30); break;
      case "budget": targetCount = rand(15, 25); break;
    }
  }
  
  // Generate horses with age distribution
  const ageCategories = {
    "2yo": Math.floor(targetCount * 0.30),
    "prime": Math.floor(targetCount * 0.40),
    "veteran": Math.floor(targetCount * 0.20),
    "breeding": Math.floor(targetCount * 0.10)
  };
  
  // Fill remaining from prime (most common)
  const totalAssigned = Object.values(ageCategories).reduce((a, b) => a + b, 0);
  ageCategories.prime += targetCount - totalAssigned;
  
  // Generate horses for each category
  for (const [category, count] of Object.entries(ageCategories)) {
    for (let i = 0; i < count; i++) {
      const age = getAgeFromCategory(category as "2yo" | "prime" | "veteran" | "breeding");
      horses.push(generateNpcHorse(stable.id, stable.tier, age));
    }
  }
  
  return horses;
}

/**
 * Generate horses for all stables
 * Returns both the updated stables and all generated horses
 */
export function generateAllNpcHorses(stables: Stable[]): { stables: Stable[]; horses: Horse[] } {
  const updatedStables: Stable[] = [];
  const allHorses: Horse[] = [];
  
  for (const stable of stables) {
    const horses = generateStableHorses(stable);
    const horseIds = horses.map(h => h.id);
    
    updatedStables.push({
      ...stable,
      horses: horseIds
    });
    
    allHorses.push(...horses);
  }
  
  return { stables: updatedStables, horses: allHorses };
}

/**
 * Calculate horse price based on tier and stats (for breeding fees)
 */
export function calculateNpcHorseValue(horse: Horse, stableTier: StableTier): number {
  const overall = (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) / 4;
  const ageMod = horse.age <= 3 ? 1.3 : horse.age >= 7 ? 0.5 : 0.9;
  const fameMod = 1 + (horse.fame / 200); // Up to 50% bonus for fame
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
