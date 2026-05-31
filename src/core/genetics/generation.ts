/**
 * generation.ts - Genotype generation
 *
 * This file provides functions for generating horse genotypes from scratch or based on
 * research data, with support for tier-based quality levels and dosage group biases.
 *
 * Dependencies: ./types (Genotype, MarkerGenotype), @/core/common/types (Locus, Rng), @/game/rng (createRng, hashStr), @/core/data/pedigreeData (AptitudinalGroup), @/core/data/stallionDNAData (getStallionResearchData, hasCompleteData), ./mapper (mapResearchDataToGenotype)
 * Related files: inheritance.ts (uses generated genotypes for breeding), phenotype.ts (resolves generated genotypes to phenotypes)
 */

import type { Genotype, MarkerGenotype } from "./types";
import type { Locus } from "@/core/common/types";
import type { Rng } from "@/core/common/types";
import { createRng, hashStr } from "@/game/rng";
import type { AptitudinalGroup } from "@/core/data/pedigreeData";
import { getStallionResearchData, hasCompleteData } from "@/core/data/stallionDNAData";
import { mapResearchDataToGenotype } from "./mapper";

const DOSAGE_BIASES: Record<
  AptitudinalGroup,
  {
    speedBias: number;
    staminaBias: number;
    styleBias: number;
    fiberBias: number;
    durabilityBias: number;
  }
> = {
  Brilliant: {
    speedBias: +0.3,
    staminaBias: -0.2,
    styleBias: 1.5,
    fiberBias: -0.5,
    durabilityBias: 0,
  },
  Classic: { speedBias: 0, staminaBias: 0, styleBias: 2.5, fiberBias: 0, durabilityBias: 0 },
  Intermediate: {
    speedBias: +0.1,
    staminaBias: +0.1,
    styleBias: 2.0,
    fiberBias: 0,
    durabilityBias: 0,
  },
  Solid: {
    speedBias: -0.2,
    staminaBias: +0.3,
    styleBias: 3.5,
    fiberBias: +0.5,
    durabilityBias: +0.2,
  },
  Professional: { speedBias: 0, staminaBias: 0, styleBias: 2.5, fiberBias: 0, durabilityBias: 0 },
};

/**
 * Generate random genotype based on tier.
 *
 * Creates a complete genotype with random alleles based on the specified tier
 * (starter, budget, mid, elite). Higher tiers have better allele ranges.
 *
 * @param rng - Random number generator
 * @param tier - Quality tier
 * @returns Generated genotype
 *
 * @example
 * const genotype = generateGenotype(rng, "elite");
 */
export function generateGenotype(
  rng: Rng,
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
): Genotype {
  const alleleRange: [number, number] =
    tier === "elite" ? [3, 5] : tier === "mid" ? [2, 4] : tier === "budget" ? [1, 4] : [1, 3];

  const rollAllele = () => rng.range(alleleRange[0], alleleRange[1]);
  const rollLocus = (): Locus => [rollAllele(), rollAllele()];
  const rollStatDNA = () => Array.from({ length: 10 }, rollLocus);

  const rGray = rng.next();
  const gray: Locus = rGray < 0.07 ? [1, 0] : [0, 0];

  const rExt = rng.next();
  let extension: Locus;
  if (rExt < 0.02) extension = [2, 0];
  else if (rExt < 0.03) extension = [3, 0];
  else if (rExt < 0.75) extension = [1, 0];
  else extension = [0, 0];

  const rAg = rng.next();
  let agouti: Locus;
  if (rAg < 0.15) agouti = [3, 0];
  else if (rAg < 0.25) agouti = [2, 0];
  else if (rAg < 0.85) agouti = [1, 0];
  else agouti = [0, 0];

  const rCr = rng.next();
  let cream: Locus;
  if (rCr < 0.005) cream = [3, 3];
  else if (rCr < 0.01) cream = [3, 0];
  else if (rCr < 0.02) cream = [2, 0];
  else if (rCr < 0.05) cream = [1, 0];
  else cream = [0, 0];

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
    geneticDiversity: 0.5 + rng.next() * 0.5,
    lethalCarriers: {
      csnb: rng.next() < 0.05,
      hypp: rng.next() < 0.03,
      olws: rng.next() < 0.02,
      ffs1: rng.next() < 0.02,
    },
  };

  const rollHealthLocus = (): Locus => {
    const r = rng.next();
    if (r < 0.7) return [rng.range(1, 2), rng.range(1, 2)];
    if (r < 0.95) return [rng.range(2, 3), rng.range(2, 3)];
    return [rng.range(4, 5), rng.range(4, 5)];
  };

  // Roll new health loci with tier-specific affected rates
  // Convention: low allele sum (≤3) = susceptible, (4-6) = carrier, (≥7) = healthy
  const rollTieredHealthLocus = (affectedRate: number): Locus => {
    if (rng.next() < affectedRate) {
      // Affected: low allele sum (≤3)
      return [rng.range(1, 2), rng.range(1, 2)];
    } else if (rng.next() < 0.5) {
      // Carrier: medium allele sum (4-6)
      return [rng.range(2, 3), rng.range(2, 4)];
    } else {
      // Healthy: high allele sum (≥7)
      return [rng.range(3, 5), rng.range(4, 5)];
    }
  };

  // Tier-specific affected rates
  const pssmRate = tier === "starter" || tier === "budget" ? 0.08 : tier === "mid" ? 0.05 : 0.02;
  const rerRate = tier === "starter" || tier === "budget" ? 0.06 : tier === "mid" ? 0.04 : 0.02;
  const epmRate = tier === "starter" || tier === "budget" ? 0.07 : tier === "mid" ? 0.05 : 0.03;

  const rollMarkingsLocus = (presence: number): Locus => {
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
      distance: [rng.range(1, 10), rng.range(1, 10)],
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
    heart: Array.from({ length: 5 }, rollLocus),
    fiberType: rollLocus(),
    stride: rollLocus(),
    trackBias: rollLocus(),
    mudAptitude: rollLocus(),
    weatherAptitude: rollLocus(),
    trainability: rollLocus(),
    peakAge: rollLocus(),
    recovery: rollLocus(),
    fertility: rollLocus(),
    foalingEase: rollLocus(),
    markings: {
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
      efna5: rng.next() < 0.07 ? [1, 1] : [rng.range(2, 5), rng.range(2, 5)],
      pssm: rollTieredHealthLocus(pssmRate),
      rer: rollTieredHealthLocus(rerRate),
      epm: rollTieredHealthLocus(epmRate),
    },
  };
}

/**
 * Apply dosage biases to genotype.
 *
 * Modifies genotype alleles based on dosage group biases for speed, stamina,
 * style, fiber type, and durability.
 *
 * @param genotype - Base genotype
 * @param dosageGroups - Dosage groups to apply
 * @param tier - Quality tier
 * @returns Modified genotype
 *
 * @example
 * const biased = applyDosageBiases(genotype, ["Brilliant"], "elite");
 */
export function applyDosageBiases(
  genotype: Genotype,
  dosageGroups?: AptitudinalGroup[],
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
): Genotype {
  if (!dosageGroups || dosageGroups.length === 0) return genotype;

  const alleleMin = tier === "elite" ? 3 : tier === "mid" ? 2 : tier === "budget" ? 1 : 1;
  const alleleMax = 5;

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

  const count = dosageGroups.length;
  totalSpeedBias /= count;
  totalStaminaBias /= count;
  totalStyleBias /= count;
  totalFiberBias /= count;
  totalDurabilityBias /= count;

  if (totalSpeedBias !== 0) {
    genotype.stats.speed = genotype.stats.speed.map((l) => [
      Math.max(alleleMin, Math.min(alleleMax, l[0] + totalSpeedBias)),
      Math.max(alleleMin, Math.min(alleleMax, l[1] + totalSpeedBias)),
    ]) as Locus[];
  }

  if (totalStaminaBias !== 0) {
    genotype.stats.stamina = genotype.stats.stamina.map((l) => [
      Math.max(alleleMin, Math.min(alleleMax, l[0] + totalStaminaBias)),
      Math.max(alleleMin, Math.min(alleleMax, l[1] + totalStaminaBias)),
    ]) as Locus[];
  }

  if (totalStyleBias !== 0) {
    const baseStyle = (genotype.style[0] + genotype.style[1]) / 2;
    const biasedStyle = Math.max(1, Math.min(4, baseStyle + totalStyleBias));
    genotype.style = [biasedStyle, biasedStyle];
  }

  if (totalFiberBias !== 0) {
    genotype.fiberType = [
      Math.max(alleleMin, Math.min(alleleMax, genotype.fiberType[0] + totalFiberBias)),
      Math.max(alleleMin, Math.min(alleleMax, genotype.fiberType[1] + totalFiberBias)),
    ];
  }

  if (totalDurabilityBias !== 0) {
    genotype.durability = [
      Math.max(alleleMin, Math.min(alleleMax, genotype.durability[0] + totalDurabilityBias)),
      Math.max(alleleMin, Math.min(alleleMax, genotype.durability[1] + totalDurabilityBias)),
    ];
  }

  return genotype;
}

/**
 * Generate deterministic genotype from stallion name.
 *
 * Creates a deterministic genotype based on stallion name using seeded RNG,
 * with optional dosage biases applied.
 *
 * @param stallionName - Name of stallion (seed for RNG)
 * @param tier - Quality tier
 * @param dosageGroups - Optional dosage groups to apply
 * @param achievements - Optional achievements
 * @returns Generated genotype
 *
 * @example
 * const genotype = generateDeterministicGenotype("Secretariat", "elite");
 */
export function generateDeterministicGenotype(
  stallionName: string,
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
  dosageGroups?: AptitudinalGroup[],
  achievements?: string[],
): Genotype {
  const rng = createRng(hashStr(stallionName));
  const baseGenotype = generateGenotype(rng, tier);
  const biasedGenotype = applyDosageBiases(baseGenotype, dosageGroups, tier);
  // Achievement bonuses can be added here if needed, or in a separate pass
  return biasedGenotype;
}

/**
 * Generate research-based genotype from stallion name.
 *
 * Uses research data if available for the stallion, otherwise falls back to
 * deterministic generation.
 *
 * @param stallionName - Name of stallion
 * @param tier - Quality tier
 * @param dosageGroups - Optional dosage groups to apply
 * @param achievements - Optional achievements
 * @returns Generated genotype
 *
 * @example
 * const genotype = generateResearchBasedGenotype("Secretariat", "elite");
 */
export function generateResearchBasedGenotype(
  stallionName: string,
  tier: "starter" | "budget" | "mid" | "elite" = "budget",
  dosageGroups?: AptitudinalGroup[],
  achievements?: string[],
): Genotype {
  const researchData = getStallionResearchData(stallionName);
  if (researchData && hasCompleteData(researchData)) {
    return mapResearchDataToGenotype(researchData, tier);
  }
  return generateDeterministicGenotype(stallionName, tier, dosageGroups, achievements);
}
