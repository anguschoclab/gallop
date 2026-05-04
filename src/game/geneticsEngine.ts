import type { 
  Genotype, 
  Locus, 
  Allele, 
  ColorGenotype, 
  StatGenotype, 
  PreferenceGenotype,
  HorseStats,
  CoatColor,
  RunningStyle
} from "./types";
import type { Rng } from "./rng";

export const TRAIT_VALUES: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
export const TRAIT_SCORE: Record<string, number> = { excellent: 1.0, good: 0.75, fair: 0.5, poor: 0.25 };

/**
 * DNA -> Phenotype Engine
 * Translates hidden genetic markers into visible horse attributes.
 */

// --- 1. Color Phenotype (Expanded Mendelian Logic) ---
// Allele values on each locus encode modifiers beyond simple dominant/recessive:
//   gray   [0]=off [1]=gray
//   extension [0]=chestnut [1]=black pigment [2]=roan modifier [3]=dun modifier
//   agouti [0]=black [1]=bay [2]=seal-brown [3]=dark-bay
//   cream  [0]=none [1]=single-dilute [2]=champagne [3]=grulla
export function resolveCoatColor(color: ColorGenotype): CoatColor {
  const isGray = color.gray[0] === 1 || color.gray[1] === 1;
  if (isGray) return "gray";

  // White: extremely rare — both cream alleles at 3+ (grulla/champagne double)
  if (color.cream[0] >= 3 && color.cream[1] >= 3) return "white";

  const hasExtension = color.extension[0] >= 1 || color.extension[1] >= 1;
  const hasAgouti = color.agouti[0] >= 1 || color.agouti[1] >= 1;
  const isDilute = color.cream[0] === 1 || color.cream[1] === 1;
  const isChampagne = color.cream[0] === 2 || color.cream[1] === 2;
  const isGrulla = color.cream[0] === 3 || color.cream[1] === 3;
  const isRoan = color.extension[0] === 2 || color.extension[1] === 2;
  const isDun = color.extension[0] === 3 || color.extension[1] === 3;

  // Roan modifier overrides base color
  if (isRoan) return "roan";

  // Dun modifier
  if (isDun) return "dun";

  // Grulla: dun-factor on a black base (no extension + grulla cream allele)
  if (isGrulla) return "grulla";

  // Champagne: metallic modifier
  if (isChampagne) return "champagne";

  if (!hasExtension) {
    if (isDilute) return "palomino";
    // Liver chestnut: darker chestnut variant when agouti has dark modifiers
    if (color.agouti[0] >= 2 || color.agouti[1] >= 2) return "liver-chestnut";
    return "chestnut";
  }

  if (hasAgouti) {
    if (isDilute) return "buckskin";
    // Dark bay / seal brown from higher agouti alleles
    if (color.agouti[0] >= 3 || color.agouti[1] >= 3) return "dark-bay";
    if (color.agouti[0] === 2 || color.agouti[1] === 2) return "seal-brown";
    return "bay";
  }

  return "black";
}

// --- 2. Stat Phenotype (Polygenic Logic) ---
function sumLoci(loci: Locus[]): number {
  // 10 loci, each allele 1-5. Min sum = 20, Max sum = 100.
  return loci.reduce((acc, [a1, a2]) => acc + a1 + a2, 0);
}

export function resolveStats(stats: StatGenotype): HorseStats {
  return {
    speed: sumLoci(stats.speed),
    stamina: sumLoci(stats.stamina),
    acceleration: sumLoci(stats.acceleration),
    consistency: sumLoci(stats.consistency),
  };
}

// --- 3. Inheritance Engine (The Crossover) ---
export function crossover(sireLocus: Locus, damLocus: Locus, rng: Rng, mutationChance = 0.005): Locus {
  let a1 = rng.next() < 0.5 ? sireLocus[0] : sireLocus[1];
  let a2 = rng.next() < 0.5 ? damLocus[0] : damLocus[1];

  // Random mutation
  if (rng.next() < mutationChance) a1 = Math.max(1, Math.min(5, a1 + (rng.next() < 0.5 ? 1 : -1)));
  if (rng.next() < mutationChance) a2 = Math.max(1, Math.min(5, a2 + (rng.next() < 0.5 ? 1 : -1)));

  return [a1, a2];
}

export function inheritDNA(sire: Genotype, dam: Genotype, rng: Rng): Genotype {
  const crossoverLoci = (s: Locus[], d: Locus[]) => s.map((sl, i) => crossover(sl, d[i], rng));

  return {
    color: {
      extension: crossover(sire.color.extension, dam.color.extension, rng),
      agouti: crossover(sire.color.agouti, dam.color.agouti, rng),
      gray: crossover(sire.color.gray, dam.color.gray, rng),
      cream: crossover(sire.color.cream, dam.color.cream, rng),
    },
    stats: {
      speed: crossoverLoci(sire.stats.speed, dam.stats.speed),
      stamina: crossoverLoci(sire.stats.stamina, dam.stats.stamina),
      acceleration: crossoverLoci(sire.stats.acceleration, dam.stats.acceleration),
      consistency: crossoverLoci(sire.stats.consistency, dam.stats.consistency),
    },
    preferences: {
      distance: crossover(sire.preferences.distance, dam.preferences.distance, rng),
      surface: crossover(sire.preferences.surface, dam.preferences.surface, rng),
      climbing: crossover(sire.preferences.climbing, dam.preferences.climbing, rng),
      cornering: crossover(sire.preferences.cornering, dam.preferences.cornering, rng),
    },
    style: crossover(sire.style, dam.style, rng),
    mental: crossover(sire.mental, dam.mental, rng),
    physical: crossover(sire.physical, dam.physical, rng),
    durability: crossover(sire.durability, dam.durability, rng),
    size: crossover(sire.size, dam.size, rng),
  };
}

// --- 4. Archetype Logic ---
export function resolveRunningStyle(styleLocus: Locus): RunningStyle {
  // 1: E, 2: EP, 3: P, 4: S
  const avg = (styleLocus[0] + styleLocus[1]) / 2;
  if (avg <= 1.5) return "E";
  if (avg <= 2.5) return "EP";
  if (avg <= 3.5) return "P";
  return "S";
}

// --- 5. DNA Generation (Initial Population) ---
export function generateGenotype(rng: Rng, tier: "starter" | "budget" | "mid" | "elite" = "budget"): Genotype {
  const alleleRange: [number, number] = 
    tier === "elite" ? [3, 5] : 
    tier === "mid" ? [2, 4] : 
    tier === "budget" ? [1, 4] : [1, 3];

  const rollAllele = () => rng.range(alleleRange[0], alleleRange[1]);
  const rollLocus = (): Locus => [rollAllele(), rollAllele()];
  const rollStatDNA = () => Array.from({ length: 10 }, rollLocus);

  // Color probability weighting — independent rolls per locus.
  // Allele values encode: extension [0]=chestnut [1]=black [2]=roan [3]=dun
  //                       agouti    [0]=black [1]=bay [2]=seal-brown [3]=dark-bay
  //                       cream     [0]=none [1]=dilute [2]=champagne [3]=grulla
  // Frequencies tuned to match real-world Thoroughbred coat distribution.
  const rGray = rng.next();
  const gray: Locus = rGray < 0.07 ? [1, 0] : [0, 0]; // 7% gray

  const rExt = rng.next();
  let extension: Locus;
  if (rExt < 0.02) extension = [2, 0];        // 2% roan
  else if (rExt < 0.03) extension = [3, 0];   // 1% dun
  else if (rExt < 0.75) extension = [1, 0];   // 72% black pigment
  else extension = [0, 0];                     // 25% chestnut base

  const rAg = rng.next();
  let agouti: Locus;
  if (rAg < 0.15) agouti = [3, 0];            // 15% dark-bay allele
  else if (rAg < 0.25) agouti = [2, 0];       // 10% seal-brown allele
  else if (rAg < 0.85) agouti = [1, 0];       // 60% bay allele
  else agouti = [0, 0];                        // 15% black (no agouti)

  const rCr = rng.next();
  let cream: Locus;
  if (rCr < 0.005) cream = [3, 3];            // 0.5% white (double grulla)
  else if (rCr < 0.01) cream = [3, 0];        // 0.5% grulla
  else if (rCr < 0.02) cream = [2, 0];        // 1% champagne
  else if (rCr < 0.05) cream = [1, 0];        // 3% single dilute (palomino/buckskin)
  else cream = [0, 0];                         // 95% no dilution

  return {
    color: { 
      extension: extension as Locus, 
      agouti: agouti as Locus, 
      gray: gray as Locus, 
      cream: cream as Locus 
    },
    stats: {
      speed: rollStatDNA(),
      stamina: rollStatDNA(),
      acceleration: rollStatDNA(),
      consistency: rollStatDNA(),
    },
    preferences: {
      distance: [rng.range(1, 10), rng.range(1, 10)], // 2-20 scale
      surface: [rng.range(1, 5), rng.range(1, 5)],
      climbing: [rng.range(1, 5), rng.range(1, 5)],
      cornering: [rng.range(1, 5), rng.range(1, 5)],
    },
    style: [rng.range(1, 4), rng.range(1, 4)],
    mental: rollLocus(),
    physical: rollLocus(),
    durability: rollLocus(),
    size: rollLocus(),
  };
}

// --- 6. Preference Resolution ---
export function resolveDistanceAptitude(locus: Locus): number {
  // sum 2..20. Map to 1000..3000m
  const sum = locus[0] + locus[1];
  return 800 + (sum * 120); // 1040..3200m
}

export function resolveSurfaceAptitude(locus: Locus): Record<"Turf" | "Dirt" | "Synthetic", number> {
  const sum = locus[0] + locus[1]; // 2..10
  // Higher sum = Dirt preference, Lower sum = Turf preference
  if (sum <= 4) return { Turf: 1.0, Dirt: 0.90, Synthetic: 0.95 };
  if (sum >= 8) return { Turf: 0.90, Dirt: 1.0, Synthetic: 0.95 };
  return { Turf: 0.98, Dirt: 0.98, Synthetic: 1.0 };
}

export function resolveAptitudeMultiplier(locus: Locus): number {
  const sum = locus[0] + locus[1]; // 2..10
  return 0.8 + (sum / 10) * 0.4; // 0.88..1.2
}

export function resolveTrait(locus: Locus): "excellent" | "good" | "fair" | "poor" {
  const sum = locus[0] + locus[1]; // 2..10
  if (sum >= 9) return "excellent";
  if (sum >= 7) return "good";
  if (sum >= 4) return "fair";
  return "poor";
}

export function resolveInjuryProneness(locus: Locus): number {
  const sum = locus[0] + locus[1]; // 2..10
  // Higher sum = MORE durable = LOWER proneness
  // 10 -> 0.01 (1%), 2 -> 0.10 (10%) chance per event
  return 0.12 - (sum / 10) * 0.1;
}

export function resolveSize(locus: Locus): { height: number; weight: number } {
  const sum = locus[0] + locus[1]; // 2..10
  
  // Real-world Thoroughbred benchmarks:
  // 15.0-15.2 Hands: Small/Agile (Northern Dancer 15.2h)
  // 16.0-16.2 Hands: Standard/Ideal (Secretariat 16.2h, Man o' War 16.2h)
  // 17.0+ Hands: Giant/Long-strider (Phar Lap 17.1h, Zenyatta 17.2h)
  
  // Height: 15.0 hands base + 0.25h per step above 2. Range: 15.0 to 17.0.
  // We'll add a tiny bit of random variance (±0.1) for biological realism.
  const height = 15.0 + (sum - 2) * 0.25;
  
  // Weight: 400kg base + 20kg per step. Range: 400kg to 560kg.
  const weight = 400 + (sum - 2) * 20;

  return { height, weight };
}
