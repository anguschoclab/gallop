import type {
  Genotype,
  MarkerGenotype,
  Locus,
  Allele,
  ColorGenotype,
  StatGenotype,
  PreferenceGenotype,
  HorseStats,
  CoatColor,
  RunningStyle,
  GeneticMarkers,
  HorseMarkings,
  MarkingsGenotype,
  HealthGenotype,
  SockHeight,
  FaceWhite,
} from "./types";
import type { Rng } from "./rng";
import { createRng, hashStr } from "./rng";
import type { AptitudinalGroup } from "./pedigreeData";
import { getStallionResearchData, hasCompleteData, type StallionResearchData } from "./stallionDNAData";
import { mapResearchDataToGenotype } from "./stallionDNAMapper";

export const TRAIT_VALUES: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
export const TRAIT_SCORE: Record<string, number> = {
  excellent: 1.0,
  good: 0.75,
  fair: 0.5,
  poor: 0.25,
};

/**
 * Dosage-to-DNA bias mapping
 * Used for deterministic stallion DNA generation based on Chef-de-race classification
 */
const DOSAGE_BIASES: Record<AptitudinalGroup, {
  speedBias: number;
  staminaBias: number;
  styleBias: number;
  fiberBias: number;
  durabilityBias: number;
}> = {
  Brilliant: { speedBias: +0.3, staminaBias: -0.2, styleBias: 1.5, fiberBias: -0.5, durabilityBias: 0 },
  Classic: { speedBias: 0, staminaBias: 0, styleBias: 2.5, fiberBias: 0, durabilityBias: 0 },
  Intermediate: { speedBias: +0.1, staminaBias: +0.1, styleBias: 2.0, fiberBias: 0, durabilityBias: 0 },
  Solid: { speedBias: -0.2, staminaBias: +0.3, styleBias: 3.5, fiberBias: +0.5, durabilityBias: +0.2 },
  Professional: { speedBias: 0, staminaBias: 0, styleBias: 2.5, fiberBias: 0, durabilityBias: 0 },
};

/**
 * Apply achievement-based bonuses to genotype
 * Uses keyword matching on achievement strings to apply DNA bonuses
 */
function applyAchievementBonuses(
  genotype: Genotype,
  achievements?: string[],
): Genotype {
  if (!achievements || achievements.length === 0) return genotype;

  const achievementsStr = achievements.join(" ").toLowerCase();

  // Triple Crown / Horse of the Year: boost heart, trainability, peakAge
  if (achievementsStr.includes("triple crown") || achievementsStr.includes("horse of the year")) {
    genotype.heart = genotype.heart.map(l => [
      Math.min(5, l[0] + 1),
      Math.min(5, l[1] + 1),
    ]) as Locus[];
    genotype.trainability = [
      Math.min(5, genotype.trainability[0] + 1),
      Math.min(5, genotype.trainability[1] + 1),
    ];
    genotype.peakAge = [
      Math.min(5, genotype.peakAge[0] + 1),
      Math.min(5, genotype.peakAge[1] + 1),
    ];
  }

  // Sprinter / speed achievements: boost speed, reduce stamina
  if (achievementsStr.includes("sprint") || achievementsStr.includes("speed")) {
    genotype.stats.speed = genotype.stats.speed.map(l => [
      Math.min(5, l[0] + 1),
      Math.min(5, l[1] + 1),
    ]) as Locus[];
    genotype.stats.stamina = genotype.stats.stamina.map(l => [
      Math.max(1, l[0] - 1),
      Math.max(1, l[1] - 1),
    ]) as Locus[];
    genotype.fiberType = [
      Math.max(1, genotype.fiberType[0] - 1),
      Math.max(1, genotype.fiberType[1] - 1),
    ];
  }

  // Stayer / classic / distance achievements: boost stamina, reduce speed
  if (achievementsStr.includes("stayer") || achievementsStr.includes("classic") || 
      achievementsStr.includes("distance") || achievementsStr.includes("cup")) {
    genotype.stats.stamina = genotype.stats.stamina.map(l => [
      Math.min(5, l[0] + 1),
      Math.min(5, l[1] + 1),
    ]) as Locus[];
    genotype.stats.speed = genotype.stats.speed.map(l => [
      Math.max(1, l[0] - 1),
      Math.max(1, l[1] - 1),
    ]) as Locus[];
    genotype.fiberType = [
      Math.min(5, genotype.fiberType[0] + 1),
      Math.min(5, genotype.fiberType[1] + 1),
    ];
  }

  // Champion sire: boost fertility, trainability
  if (achievementsStr.includes("champion sire") || achievementsStr.includes("leading sire")) {
    genotype.fertility = [
      Math.min(5, genotype.fertility[0] + 1),
      Math.min(5, genotype.fertility[1] + 1),
    ];
    genotype.trainability = [
      Math.min(5, genotype.trainability[0] + 1),
      Math.min(5, genotype.trainability[1] + 1),
    ];
  }

  return genotype;
}

/**
 * Apply dosage-based biases to genotype
 * Uses Chef-de-race classification to bias DNA traits
 */
function applyDosageBiases(
  genotype: Genotype,
  dosageGroups?: AptitudinalGroup[],
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
): Genotype {
  if (!dosageGroups || dosageGroups.length === 0) return genotype;

  // Get tier-based allele range for clamping
  const alleleMin = tier === "elite" ? 3 : tier === "mid" ? 2 : tier === "budget" ? 1 : 1;
  const alleleMax = 5;

  // Combine biases from all dosage groups
  let totalSpeedBias = 0;
  let totalStaminaBias = 0;
  let totalStyleBias = 0;
  let totalFiberBias = 0;
  let totalDurabilityBias = 0;

  for (const group of dosageGroups) {
    const bias = DOSAGE_BIASES[group];
    if (bias) {
      totalSpeedBias += bias.speedBias;
      totalStaminaBias += bias.staminaBias;
      totalStyleBias += bias.styleBias;
      totalFiberBias += bias.fiberBias;
      totalDurabilityBias += bias.durabilityBias;
    }
  }

  // Average biases if multiple groups
  const count = dosageGroups.length;
  totalSpeedBias /= count;
  totalStaminaBias /= count;
  totalStyleBias /= count;
  totalFiberBias /= count;
  totalDurabilityBias /= count;

  // Apply speed bias to speed loci
  if (totalSpeedBias !== 0) {
    genotype.stats.speed = genotype.stats.speed.map(l => [
      Math.max(alleleMin, Math.min(alleleMax, l[0] + totalSpeedBias)),
      Math.max(alleleMin, Math.min(alleleMax, l[1] + totalSpeedBias)),
    ]) as Locus[];
  }

  // Apply stamina bias to stamina loci
  if (totalStaminaBias !== 0) {
    genotype.stats.stamina = genotype.stats.stamina.map(l => [
      Math.max(alleleMin, Math.min(alleleMax, l[0] + totalStaminaBias)),
      Math.max(alleleMin, Math.min(alleleMax, l[1] + totalStaminaBias)),
    ]) as Locus[];
  }

  // Apply style bias (convert to locus value: 1=E, 2=EP, 3=P, 4=S)
  if (totalStyleBias !== 0) {
    const baseStyle = (genotype.style[0] + genotype.style[1]) / 2;
    const biasedStyle = Math.max(1, Math.min(4, baseStyle + totalStyleBias));
    genotype.style = [biasedStyle, biasedStyle];
  }

  // Apply fiber bias
  if (totalFiberBias !== 0) {
    genotype.fiberType = [
      Math.max(alleleMin, Math.min(alleleMax, genotype.fiberType[0] + totalFiberBias)),
      Math.max(alleleMin, Math.min(alleleMax, genotype.fiberType[1] + totalFiberBias)),
    ];
  }

  // Apply durability bias
  if (totalDurabilityBias !== 0) {
    genotype.durability = [
      Math.max(alleleMin, Math.min(alleleMax, genotype.durability[0] + totalDurabilityBias)),
      Math.max(alleleMin, Math.min(alleleMax, genotype.durability[1] + totalDurabilityBias)),
    ];
  }

  return genotype;
}

/**
 * Generate deterministic DNA for a stallion based on its name and characteristics
 * Uses stallion name as RNG seed for reproducibility
 * Applies dosage-based biases and achievement-based bonuses
 * Maintains tier-based quality floor
 */
export function generateDeterministicGenotype(
  stallionName: string,
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
  dosageGroups?: AptitudinalGroup[],
  achievements?: string[],
): Genotype {
  // Use stallion name as seed for determinism
  const rng = createRng(hashStr(stallionName));

  // Generate base genotype using existing function
  const baseGenotype = generateGenotype(rng, tier);

  // Apply dosage-based biases
  const biasedGenotype = applyDosageBiases(baseGenotype, dosageGroups, tier);

  // Apply achievement-based bonuses
  const finalGenotype = applyAchievementBonuses(biasedGenotype, achievements);

  return finalGenotype;
}

/**
 * Generate research-based DNA for a stallion
 * Checks for manually researched data first, falls back to deterministic generation
 * Provides historical accuracy for key stallions while ensuring all stallions have DNA
 */
export function generateResearchBasedGenotype(
  stallionName: string,
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
  dosageGroups?: AptitudinalGroup[],
  achievements?: string[],
): Genotype {
  // Check if research data exists for this stallion
  const researchData = getStallionResearchData(stallionName);

  // If research data exists and is complete, use it
  if (researchData && hasCompleteData(researchData)) {
    return mapResearchDataToGenotype(researchData, tier);
  }

  // Otherwise, fall back to deterministic generation
  return generateDeterministicGenotype(stallionName, tier, dosageGroups, achievements);
}

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
export function crossover(
  sireLocus: Locus,
  damLocus: Locus,
  rng: Rng,
  mutationChance = 0.005,
): Locus {
  let a1 = rng.next() < 0.5 ? sireLocus[0] : sireLocus[1];
  let a2 = rng.next() < 0.5 ? damLocus[0] : damLocus[1];

  // Random mutation
  if (rng.next() < mutationChance) a1 = Math.max(1, Math.min(5, a1 + (rng.next() < 0.5 ? 1 : -1)));
  if (rng.next() < mutationChance) a2 = Math.max(1, Math.min(5, a2 + (rng.next() < 0.5 ? 1 : -1)));

  return [a1, a2];
}

function inheritTrait(
  a: "excellent" | "good" | "fair" | "poor",
  b: "excellent" | "good" | "fair" | "poor",
  rng: Rng,
): "excellent" | "good" | "fair" | "poor" {
  return rng.next() < 0.5 ? a : b;
}

export function inheritDNA(sire: Genotype, dam: Genotype, rng: Rng): Genotype {
  const crossoverLoci = (s: Locus[], d: Locus[]) => s.map((sl, i) => crossover(sl, d[i], rng));

  // Leopard complex: dominant is dominant if either parent carries it
  const lp =
    sire.markers.leopardComplex === "dominant" || dam.markers.leopardComplex === "dominant"
      ? "dominant"
      : sire.markers.leopardComplex === "heterozygous" ||
          dam.markers.leopardComplex === "heterozygous"
        ? rng.next() < 0.5
          ? "heterozygous"
          : "recessive"
        : "recessive";
  const csnbRisk: MarkerGenotype["csnbRisk"] = lp === "dominant" ? "high" : "low";

  // Lethal carriers: each gene carrier flag independent Mendelian
  const inheritCarrier = (a: boolean, b: boolean) =>
    a && b ? rng.next() < 0.75 : a || b ? rng.next() < 0.5 : false;

  const inheritedMarkers: MarkerGenotype = {
    leopardComplex: lp,
    csnbRisk,
    sensoryPerception: inheritTrait(
      sire.markers.sensoryPerception,
      dam.markers.sensoryPerception,
      rng,
    ),
    signalTransduction: inheritTrait(
      sire.markers.signalTransduction,
      dam.markers.signalTransduction,
      rng,
    ),
    immunity: inheritTrait(sire.markers.immunity, dam.markers.immunity, rng),
    geneticDiversity: (sire.markers.geneticDiversity + dam.markers.geneticDiversity) / 2,
    lethalCarriers: {
      csnb: inheritCarrier(sire.markers.lethalCarriers.csnb, dam.markers.lethalCarriers.csnb),
      hypp: inheritCarrier(sire.markers.lethalCarriers.hypp, dam.markers.lethalCarriers.hypp),
      olws: inheritCarrier(sire.markers.lethalCarriers.olws, dam.markers.lethalCarriers.olws),
      ffs1: inheritCarrier(sire.markers.lethalCarriers.ffs1, dam.markers.lethalCarriers.ffs1),
    },
  };

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
    markers: inheritedMarkers,
    // --- New loci, all crossed-over identically. Heart is polygenic (5 loci). ---
    heart: crossoverLoci(sire.heart, dam.heart),
    fiberType: crossover(sire.fiberType, dam.fiberType, rng),
    stride: crossover(sire.stride, dam.stride, rng),
    trackBias: crossover(sire.trackBias, dam.trackBias, rng),
    mudAptitude: crossover(sire.mudAptitude, dam.mudAptitude, rng),
    trainability: crossover(sire.trainability, dam.trainability, rng),
    peakAge: crossover(sire.peakAge, dam.peakAge, rng),
    recovery: crossover(sire.recovery, dam.recovery, rng),
    fertility: crossover(sire.fertility, dam.fertility, rng),
    foalingEase: crossover(sire.foalingEase, dam.foalingEase, rng),
    markings: {
      socks: crossover(sire.markings.socks, dam.markings.socks, rng),
      face: crossover(sire.markings.face, dam.markings.face, rng),
      silverDapple: crossover(sire.markings.silverDapple, dam.markings.silverDapple, rng),
      sabino: crossover(sire.markings.sabino, dam.markings.sabino, rng),
      splashWhite: crossover(sire.markings.splashWhite, dam.markings.splashWhite, rng),
    },
    health: {
      bleeder: crossover(sire.health.bleeder, dam.health.bleeder, rng),
      roarer: crossover(sire.health.roarer, dam.health.roarer, rng),
      ocd: crossover(sire.health.ocd, dam.health.ocd, rng),
      efna5: crossover(sire.health.efna5, dam.health.efna5, rng),
    },
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

// --- 5a. Marker Genotype Resolution ---
export function resolveGeneticMarkers(genotype: Genotype): GeneticMarkers {
  return {
    leopardComplex: genotype.markers.leopardComplex,
    csnbRisk: genotype.markers.csnbRisk,
    sensoryPerception: genotype.markers.sensoryPerception,
    signalTransduction: genotype.markers.signalTransduction,
    immunity: genotype.markers.immunity,
    geneticDiversity: genotype.markers.geneticDiversity,
    lethalCarriers: genotype.markers.lethalCarriers,
  };
}

// --- 5. DNA Generation (Initial Population) ---
export function generateGenotype(
  rng: Rng,
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
): Genotype {
  const alleleRange: [number, number] =
    tier === "elite" ? [3, 5] : tier === "mid" ? [2, 4] : tier === "budget" ? [1, 4] : [1, 3];

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
  if (rExt < 0.02)
    extension = [2, 0]; // 2% roan
  else if (rExt < 0.03)
    extension = [3, 0]; // 1% dun
  else if (rExt < 0.75)
    extension = [1, 0]; // 72% black pigment
  else extension = [0, 0]; // 25% chestnut base

  const rAg = rng.next();
  let agouti: Locus;
  if (rAg < 0.15)
    agouti = [3, 0]; // 15% dark-bay allele
  else if (rAg < 0.25)
    agouti = [2, 0]; // 10% seal-brown allele
  else if (rAg < 0.85)
    agouti = [1, 0]; // 60% bay allele
  else agouti = [0, 0]; // 15% black (no agouti)

  const rCr = rng.next();
  let cream: Locus;
  if (rCr < 0.005)
    cream = [3, 3]; // 0.5% white (double grulla)
  else if (rCr < 0.01)
    cream = [3, 0]; // 0.5% grulla
  else if (rCr < 0.02)
    cream = [2, 0]; // 1% champagne
  else if (rCr < 0.05)
    cream = [1, 0]; // 3% single dilute (palomino/buckskin)
  else cream = [0, 0]; // 95% no dilution

  // --- Marker Genotype (health/immune/genetic traits) ---
  // Leopard complex (Lp): ~5% homozygous dominant, ~25% heterozygous, rest recessive
  const lpRoll = rng.next();
  const leopardComplex: MarkerGenotype["leopardComplex"] =
    lpRoll < 0.05 ? "dominant" : lpRoll < 0.3 ? "heterozygous" : "recessive";
  const csnbRisk: MarkerGenotype["csnbRisk"] = leopardComplex === "dominant" ? "high" : "low";

  const traitRoll = (): "excellent" | "good" | "fair" | "poor" => {
    const r = rng.next();
    return r < 0.15 ? "excellent" : r < 0.55 ? "good" : r < 0.85 ? "fair" : "poor";
  };

  const markers: MarkerGenotype = {
    leopardComplex,
    csnbRisk,
    sensoryPerception: traitRoll(),
    signalTransduction: traitRoll(),
    immunity: traitRoll(),
    geneticDiversity: 0.5 + rng.next() * 0.5, // 0.5–1.0
    lethalCarriers: {
      csnb: rng.next() < 0.05,
      hypp: rng.next() < 0.03,
      olws: rng.next() < 0.02,
      // Fragile Foal Syndrome Type 1 — ~2% real-world TB prevalence
      ffs1: rng.next() < 0.02,
    },
  };

  // --- Roll the new DNA loci. Tier-aware: elite stables produce horses with
  //     stronger heart/trainability/recovery; budget stables produce more
  //     middle-of-the-road values. Cosmetic markings are tier-independent.
  const rollHealthLocus = (): Locus => {
    // Health susceptibility — most horses have low risk; rare bad rolls.
    // Sum 2-3: 70%, sum 4-6: 25%, sum 7-10: 5%.
    const r = rng.next();
    if (r < 0.7) return [rng.range(1, 2), rng.range(1, 2)];
    if (r < 0.95) return [rng.range(2, 3), rng.range(2, 3)];
    return [rng.range(4, 5), rng.range(4, 5)];
  };

  const rollMarkingsLocus = (presence: number): Locus => {
    // For binary cosmetic flags: presence = probability the foal expresses
    // the modifier (allele sum >= 8). Most horses lack rare patterns.
    if (rng.next() < presence) return [rng.range(4, 5), rng.range(4, 5)];
    return [rng.range(1, 3), rng.range(1, 3)];
  };

  return {
    color: {
      extension: extension as Locus,
      agouti: agouti as Locus,
      gray: gray as Locus,
      cream: cream as Locus,
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
    markers,
    // --- New loci ---
    heart: Array.from({ length: 5 }, rollLocus),
    fiberType: rollLocus(),
    stride: rollLocus(),
    trackBias: rollLocus(),
    mudAptitude: rollLocus(),
    trainability: rollLocus(),
    peakAge: rollLocus(),
    recovery: rollLocus(),
    fertility: rollLocus(),
    foalingEase: rollLocus(),
    markings: {
      // Independent rolls per marking — segregate Mendelian-style.
      socks: [rng.range(1, 5), rng.range(1, 5)],
      face: [rng.range(1, 5), rng.range(1, 5)],
      silverDapple: rollMarkingsLocus(0.05),
      sabino: rollMarkingsLocus(0.08),
      splashWhite: rollMarkingsLocus(0.03),
    },
    health: {
      bleeder: rollHealthLocus(),
      roarer: rollHealthLocus(),
      ocd: rollHealthLocus(),
      // EFNA5 haplotype — most horses sound (sum >= 4); ~7% homozygous-negative
      // (sum <= 3) → never race. Mirrors the 32% reduced racing probability
      // from the genome study, but expressed as a hard "skeletal viability"
      // flag rather than a per-event roll.
      efna5: rng.next() < 0.07 ? [1, 1] : [rng.range(2, 5), rng.range(2, 5)],
    },
  };
}

// --- 6. Preference Resolution ---
export function resolveDistanceAptitude(locus: Locus): number {
  // sum 2..20. Map to 1000..3000m
  const sum = locus[0] + locus[1];
  return 800 + sum * 120; // 1040..3200m
}

export function resolveSurfaceAptitude(
  locus: Locus,
): Record<"Turf" | "Dirt" | "Synthetic", number> {
  const sum = locus[0] + locus[1]; // 2..10
  // Higher sum = Dirt preference, Lower sum = Turf preference
  if (sum <= 4) return { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 };
  if (sum >= 8) return { Turf: 0.9, Dirt: 1.0, Synthetic: 0.95 };
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

// ============================================================================
// New DNA traits — Tier 1+2 performance, development, reproduction, cosmetic, health
// ============================================================================

// --- Tier 1: Heart score (polygenic, 5 loci, hidden) ---
// Cardiovascular efficiency — multiplier on late-race stamina output.
// Polygenic (5 loci, allele 1-5 each) so it's hard to predict from a single
// covering. Range: 0.85x (small heart) → 1.15x (Secretariat-class).
export function resolveHeartScore(loci: Locus[]): number {
  const sum = loci.reduce((acc, [a, b]) => acc + a + b, 0); // 10..50
  // Map [10, 50] → [0.85, 1.15]
  return 0.85 + ((sum - 10) / 40) * 0.3;
}

// --- Tier 1: Muscle fiber type (hidden) ---
// Biases the expression of speed/stamina by race distance.
// sum 2-4: sprinter (favors speed in <1400m); 5-7: balanced; 8-10: stayer.
export function resolveFiberBias(locus: Locus): "sprinter" | "balanced" | "stayer" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "sprinter";
  if (sum >= 8) return "stayer";
  return "balanced";
}

// Returns multipliers applied to topSpeed and staminaFactor at race time.
// Sprinters lose ground in long races; stayers lose ground in short races.
// Distance bands: short <1400m, mid 1400-1800m, long >1800m.
export function fiberDistanceModifier(
  bias: "sprinter" | "balanced" | "stayer",
  distance: number,
): { speedMul: number; staminaMul: number } {
  const isShort = distance < 1400;
  const isLong = distance > 1800;
  if (bias === "sprinter") {
    if (isShort) return { speedMul: 1.04, staminaMul: 1.0 };
    if (isLong) return { speedMul: 0.96, staminaMul: 0.94 };
    return { speedMul: 1.0, staminaMul: 0.98 };
  }
  if (bias === "stayer") {
    if (isShort) return { speedMul: 0.96, staminaMul: 1.0 };
    if (isLong) return { speedMul: 1.0, staminaMul: 1.06 };
    return { speedMul: 0.99, staminaMul: 1.02 };
  }
  return { speedMul: 1.0, staminaMul: 1.0 };
}

// --- Tier 2: Stride length (hidden) ---
// Long stride favors big tracks/straights; short stride favors tight turns.
export function resolveStrideType(locus: Locus): "short" | "balanced" | "long" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "short";
  if (sum >= 8) return "long";
  return "balanced";
}

// --- Tier 2: Track bias (hidden) ---
// Left-handed vs right-handed track preference. Most North American tracks
// run counter-clockwise (left-handed); most European tracks clockwise.
export function resolveTrackPreference(locus: Locus): "left" | "balanced" | "right" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "left";
  if (sum >= 8) return "right";
  return "balanced";
}

// --- Tier 2: Mud aptitude (hidden) ---
// Multiplier on the conditions speed effect when ground is soft/heavy.
// 0.85 (hates mud) to 1.15 (mudder). At "fast" track, no effect.
export function resolveMudAptitude(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.85 + ((sum - 2) / 8) * 0.3;
}

// --- Tier 1: Trainability (hidden) ---
// Multiplier on the training-success roll in trainHorse.
// Range: 0.5 (slow learner) to 1.4 (savant). Most horses cluster near 1.0.
export function resolveTrainability(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.5 + ((sum - 2) / 8) * 0.9;
}

// --- Tier 1: Peak age / development curve (hidden) ---
// When the horse hits peak ability. 3 = early-developer 2-3yo prodigy;
// 7 = late bloomer that improves through age 6-7. Stat growth in trainHorse
// caps at (currentAge / peakAge) × potential, so early-peakers are ready
// to race at 2 but plateau quickly.
export function resolvePeakAge(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 3;
  if (sum <= 5) return 4;
  if (sum <= 7) return 5;
  if (sum <= 9) return 6;
  return 7;
}

// --- Tier 1: Recovery rate (hidden) ---
// Multiplier on daily energy regen (currently +35/day flat).
// 0.7 (hard-keeper) to 1.4 (iron horse).
export function resolveRecoveryRate(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.7 + ((sum - 2) / 8) * 0.7;
}

// --- Tier 3: Fertility (hidden) ---
// For mares: conception probability per cover (0.70-0.99).
// For stallions: book-completion percentage (% of bookings that go in foal).
// Both consume the same locus.
export function resolveFertility(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.7 + ((sum - 2) / 8) * 0.29;
}

// --- Tier 3: Foaling ease (hidden, mare-only effect) ---
// Multiplier on the term-complication rate. Low = easy foaler, fewer
// stillborns / unable-to-stand outcomes. High = dystocia-prone.
export function resolveFoalingEase(locus: Locus): number {
  const sum = locus[0] + locus[1];
  // Higher locus sum = easier foaling = LOWER multiplier on complication rate.
  // Range: 0.6 (easy) → 1.4 (hard).
  return 1.4 - ((sum - 2) / 8) * 0.8;
}

// --- Tier 4: Cosmetic markings (visible, no gameplay effect) ---
function resolveSocks(locus: Locus): SockHeight {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return "none"; // 60%
  if (sum <= 7) return "sock"; // 35%
  return "stocking"; // 5%
}

function resolveFaceWhite(locus: Locus): FaceWhite {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return "none"; // 50%
  if (sum <= 6) return "star"; // 25%
  if (sum <= 9) return "blaze"; // 20%
  return "bald"; // 5%
}

export function resolveMarkings(g: MarkingsGenotype): HorseMarkings {
  return {
    socks: resolveSocks(g.socks),
    face: resolveFaceWhite(g.face),
    silverDapple: g.silverDapple[0] + g.silverDapple[1] >= 8,
    sabino: g.sabino[0] + g.sabino[1] >= 8,
    splashWhite: g.splashWhite[0] + g.splashWhite[1] >= 8,
  };
}

// --- Tier 6: Health susceptibility (hidden, gameplay effect) ---
// All map to a 0..1 risk score. Low score = healthy, high = symptomatic.
function resolveRiskLocus(locus: Locus, maxRisk: number): number {
  const sum = locus[0] + locus[1];
  // Inverted: higher allele sum = MORE risk (the locus encodes susceptibility).
  return ((sum - 2) / 8) * maxRisk;
}

export function resolveBleederRisk(locus: Locus): number {
  return resolveRiskLocus(locus, 0.15);
}
export function resolveRoarerRisk(locus: Locus): number {
  return resolveRiskLocus(locus, 0.1);
}
export function resolveOcdRisk(locus: Locus): number {
  return resolveRiskLocus(locus, 0.1);
}

// EFNA5 chromosome-14 marker. Homozygous recessive (sum <= 3) = skeletal
// development insufficient for racing. Real-world genome study: 32% lower
// racing probability for homozygous-negative carriers; we model as a hard
// gate (the horse never makes it to the track) since a partial dampener
// would add no gameplay-distinguishable signal.
export function resolveRacingViable(locus: Locus): boolean {
  return locus[0] + locus[1] >= 4;
}

// --- Tier 5: Heterozygosity (population genetics) ---
// Counts heterozygous loci across the genotype. Foals with high heterozygosity
// get a small fitness bonus (hybrid vigor); homozygous foals are dampened
// (inbreeding depression). Returns 0..1.
export function computeHeterozygosity(g: Genotype): number {
  const loci: Locus[] = [
    g.color.extension,
    g.color.agouti,
    g.color.gray,
    g.color.cream,
    g.preferences.distance,
    g.preferences.surface,
    g.preferences.climbing,
    g.preferences.cornering,
    g.style,
    g.mental,
    g.physical,
    g.durability,
    g.size,
    g.fiberType,
    g.stride,
    g.trackBias,
    g.mudAptitude,
    g.trainability,
    g.peakAge,
    g.recovery,
    g.fertility,
    g.foalingEase,
    g.health.bleeder,
    g.health.roarer,
    g.health.ocd,
    g.health.efna5,
    ...g.heart,
    ...g.stats.speed,
    ...g.stats.stamina,
    ...g.stats.acceleration,
    ...g.stats.consistency,
  ];
  const heteroCount = loci.filter(([a, b]) => a !== b).length;
  return heteroCount / loci.length;
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
