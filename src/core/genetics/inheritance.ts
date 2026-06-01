/**
 * inheritance.ts - Genetic inheritance logic
 *
 * This file provides functions for genetic inheritance including chromosome-aware
 * crossover, independent assortment, and trait inheritance with regression to mean.
 *
 * Dependencies: ./types (Genotype, MarkerGenotype), @/core/common/types (Locus, Rng), ./chromosomes (crossoverAllChromosomes, ChromosomeId), ./linkageMap (LINKAGE_MAP, getLociByChromosome, INDEPENDENTLY_ASSORTING_LOCI)
 * Related files: phenotype.ts (resolves genotypes to phenotypes), chromosomes.ts (provides chromosome crossover logic)
 */

import type { Genotype, MarkerGenotype } from "./types";
import type { Locus } from "@/core/common/types";
import type { Rng } from "@/core/common/types";
import { crossoverAllChromosomes, type ChromosomeId } from "./chromosomes";
import { LINKAGE_MAP, getLociByChromosome, INDEPENDENTLY_ASSORTING_LOCI } from "./linkageMap";

/**
 * Independent crossover for loci that assort independently.
 *
 * Used for markers and color/markings that are not chromosome-linked.
 * Performs Mendelian 50/50 crossover with optional mutation.
 *
 * @param sireLocus - Sire locus
 * @param damLocus - Dam locus
 * @param rng - Random number generator
 * @param mutationChance - Mutation probability (default 0.005)
 * @returns Offspring locus
 *
 * @example
 * const locus = crossover(sireLocus, damLocus, rng);
 */
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

/**
 * Incomplete dominance inheritance for marker traits
 * Implements probability-based inheritance with regression to mean
 *
 * @param a - Trait of the first parent
 * @param b - Trait of the second parent
 * @param rng - Random number generator
 * @returns Inherited trait level
 */
function inheritTrait(
  a: "excellent" | "good" | "fair" | "poor",
  b: "excellent" | "good" | "fair" | "poor",
  rng: Rng,
): "excellent" | "good" | "fair" | "poor" {
  const combinations: Record<
    string,
    { result: "excellent" | "good" | "fair" | "poor"; probability: number }[]
  > = {
    "excellent-excellent": [{ result: "excellent", probability: 1.0 }],
    "excellent-good": [
      { result: "excellent", probability: 0.7 },
      { result: "good", probability: 0.3 },
    ],
    "excellent-fair": [{ result: "good", probability: 1.0 }],
    "excellent-poor": [
      { result: "good", probability: 0.5 },
      { result: "fair", probability: 0.5 },
    ],
    "good-good": [{ result: "good", probability: 1.0 }],
    "good-fair": [
      { result: "good", probability: 0.7 },
      { result: "fair", probability: 0.3 },
    ],
    "good-poor": [{ result: "fair", probability: 1.0 }],
    "fair-fair": [{ result: "fair", probability: 1.0 }],
    "fair-poor": [
      { result: "fair", probability: 0.7 },
      { result: "poor", probability: 0.3 },
    ],
    "poor-poor": [{ result: "poor", probability: 1.0 }],
  };

  const order = ["excellent", "good", "fair", "poor"];
  const [stronger, weaker] = order.indexOf(a) <= order.indexOf(b) ? [a, b] : [b, a];
  const key = `${stronger}-${weaker}`;
  const options = combinations[key] || [{ result: "fair", probability: 1.0 }];
  const roll = rng.next();
  let cumulative = 0;

  for (const option of options) {
    cumulative += option.probability;
    if (roll < cumulative) {
      return option.result;
    }
  }

  return options[0].result;
}

/**
 * Centralized accessor for retrieving a locus from a genotype by its linkage map key.
 *
 * @param genotype - Source genotype
 * @param key - Linkage map key (e.g., 'speed.0', 'fiberType')
 * @returns The locus or undefined if not found
 */
function getLocusByKey(genotype: Genotype, key: string): Locus | undefined {
  if (key.startsWith("speed.")) {
    const idx = parseInt(key.split(".")[1]);
    return genotype.stats.speed[idx];
  }
  if (key.startsWith("stamina.")) {
    const idx = parseInt(key.split(".")[1]);
    return genotype.stats.stamina[idx];
  }
  if (key.startsWith("acceleration.")) {
    const idx = parseInt(key.split(".")[1]);
    return genotype.stats.acceleration[idx];
  }
  if (key.startsWith("consistency.")) {
    const idx = parseInt(key.split(".")[1]);
    return genotype.stats.consistency[idx];
  }
  if (key.startsWith("heart.")) {
    const idx = parseInt(key.split(".")[1]);
    return genotype.heart[idx];
  }

  const accessors: Record<string, (g: Genotype) => Locus | undefined> = {
    fiberType: (g) => g.fiberType,
    stride: (g) => g.stride,
    style: (g) => g.style,
    distance: (g) => g.preferences.distance,
    mudAptitude: (g) => g.mudAptitude,
    mental: (g) => g.mental,
    trainability: (g) => g.trainability,
    recovery: (g) => g.recovery,
    physical: (g) => g.physical,
    size: (g) => g.size,
    durability: (g) => g.durability,
    peakAge: (g) => g.peakAge,
    foalingEase: (g) => g.foalingEase,
    surface: (g) => g.preferences.surface,
    climbing: (g) => g.preferences.climbing,
    cornering: (g) => g.preferences.cornering,
    trackBias: (g) => g.trackBias,
    weatherAptitude: (g) => g.weatherAptitude,
    bleeder: (g) => g.health.bleeder,
    roarer: (g) => g.health.roarer,
    ocd: (g) => g.health.ocd,
    efna5: (g) => g.health.efna5,
    pssm: (g) => g.health.pssm,
    rer: (g) => g.health.rer,
    epm: (g) => g.health.epm,
    extension: (g) => g.color.extension,
    agouti: (g) => g.color.agouti,
    gray: (g) => g.color.gray,
    cream: (g) => g.color.cream,
    socks: (g) => g.markings.socks,
    face: (g) => g.markings.face,
    silverDapple: (g) => g.markings.silverDapple,
    sabino: (g) => g.markings.sabino,
    splashWhite: (g) => g.markings.splashWhite,
  };

  return accessors[key]?.(genotype);
}

/**
 * Inherit DNA from sire and dam genotypes.
 *
 * Performs chromosome-aware crossover for linked loci and independent assortment
 * for unlinked loci. Returns complete offspring genotype.
 *
 * @param sire - Sire genotype
 * @param dam - Dam genotype
 * @param rng - Random number generator
 * @returns Offspring genotype
 *
 * @example
 * const offspring = inheritDNA(sireGenotype, damGenotype, rng);
 */
export function inheritDNA(sire: Genotype, dam: Genotype, rng: Rng): Genotype {
  // Chromosome-aware crossover for linked loci
  // Gather loci by chromosome and perform single crossover per chromosome

  // Helper to get loci array from sire/dam for a given chromosome
  const getChromosomeLoci = (
    chromosomeId: ChromosomeId,
    genotype: Genotype,
  ): { alleles: Locus[]; positions: number[] } => {
    const alleles: Locus[] = [];
    const positions: number[] = [];

    const locusKeys = getLociByChromosome(chromosomeId);

    for (const key of locusKeys) {
      const coord = LINKAGE_MAP[key];
      if (!coord) continue;

      const allele = getLocusByKey(genotype, key);

      if (allele) {
        alleles.push(allele);
        positions.push(coord.position);
      }
    }

    return { alleles, positions };
  };

  // Build chromosome data map
  const chromosomeData = new Map<
    ChromosomeId,
    { parent1Alleles: Locus[]; parent2Alleles: Locus[]; positions: number[] }
  >();

  const chromosomes: ChromosomeId[] = [
    "ATHLETIC",
    "ENDURANCE",
    "PERFORMANCE",
    "BEHAVIORAL",
    "CONFORMATION",
    "TRACK",
    "HEALTH",
    "COLOR",
    "MARKINGS",
  ];

  for (const chromosomeId of chromosomes) {
    const sireData = getChromosomeLoci(chromosomeId, sire);
    const damData = getChromosomeLoci(chromosomeId, dam);

    if (sireData.alleles.length > 0 && sireData.alleles.length === damData.alleles.length) {
      chromosomeData.set(chromosomeId, {
        parent1Alleles: sireData.alleles,
        parent2Alleles: damData.alleles,
        positions: sireData.positions,
      });
    }
  }

  // Perform chromosome-aware crossover
  const offspringMap = crossoverAllChromosomes(chromosomeData, rng);

  // Helper to reconstruct loci arrays from offspring map
  const reconstructLoci = (chromosomeId: ChromosomeId, locusKeys: string[]): Locus[] => {
    const offspringAlleles = offspringMap.get(chromosomeId);
    const chromosomeKeys = getLociByChromosome(chromosomeId);

    if (!offspringAlleles) {
      // Fallback to independent crossover if chromosome not in map
      return locusKeys.map((key) => {
        const sireAllele = getLocusByKey(sire, key);
        const damAllele = getLocusByKey(dam, key);

        if (sireAllele && damAllele) {
          return crossover(sireAllele, damAllele, rng);
        }
        return [3, 3]; // Default fallback
      });
    }

    return locusKeys.map((key) => {
      const idx = chromosomeKeys.indexOf(key);
      if (idx >= 0 && idx < offspringAlleles.length) {
        return offspringAlleles[idx];
      }
      const sireAllele = getLocusByKey(sire, key);
      const damAllele = getLocusByKey(dam, key);
      if (sireAllele && damAllele) {
        return crossover(sireAllele, damAllele, rng);
      }
      return [3, 3];
    });
  };

  // Extract individual loci from offspring map
  const getOffspringLocus = (key: string, chromosomeId: ChromosomeId): Locus => {
    const offspringAlleles = offspringMap.get(chromosomeId);
    const locusKeys = getLociByChromosome(chromosomeId);
    const idx = locusKeys.indexOf(key);

    if (offspringAlleles && idx >= 0 && idx < offspringAlleles.length) {
      return offspringAlleles[idx];
    }

    // Fallback to independent crossover
    const sireAllele = getLocusByKey(sire, key);
    const damAllele = getLocusByKey(dam, key);

    if (sireAllele && damAllele) {
      return crossover(sireAllele, damAllele, rng);
    }
    return [3, 3]; // Default fallback
  };

  // Leopard complex (independent assortment)
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

  // Lethal carriers (independent assortment)
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

  // Build offspring genotype using chromosome-aware results.
  // Color and markings use independent allele crossover (Mendelian 50/50 within pair)
  // since whole-locus inheritance breaks dominant/recessive ratios for discrete traits.
  return {
    color: {
      extension: crossover(sire.color.extension, dam.color.extension, rng),
      agouti: crossover(sire.color.agouti, dam.color.agouti, rng),
      gray: crossover(sire.color.gray, dam.color.gray, rng),
      cream: crossover(sire.color.cream, dam.color.cream, rng),
    },
    stats: {
      speed: reconstructLoci(
        "ATHLETIC",
        getLociByChromosome("ATHLETIC").filter((k) => k.startsWith("speed.")),
      ),
      stamina: reconstructLoci(
        "ENDURANCE",
        getLociByChromosome("ENDURANCE").filter((k) => k.startsWith("stamina.")),
      ),
      acceleration: reconstructLoci(
        "PERFORMANCE",
        getLociByChromosome("PERFORMANCE").filter((k) => k.startsWith("acceleration.")),
      ),
      consistency: reconstructLoci(
        "BEHAVIORAL",
        getLociByChromosome("BEHAVIORAL").filter((k) => k.startsWith("consistency.")),
      ),
    },
    preferences: {
      distance: getOffspringLocus("distance", "ENDURANCE"),
      surface: getOffspringLocus("surface", "TRACK"),
      climbing: getOffspringLocus("climbing", "TRACK"),
      cornering: getOffspringLocus("cornering", "TRACK"),
    },
    style: getOffspringLocus("style", "PERFORMANCE"),
    mental: getOffspringLocus("mental", "BEHAVIORAL"),
    physical: getOffspringLocus("physical", "CONFORMATION"),
    durability: getOffspringLocus("durability", "CONFORMATION"),
    size: getOffspringLocus("size", "CONFORMATION"),
    markers: inheritedMarkers,
    heart: reconstructLoci(
      "PERFORMANCE",
      getLociByChromosome("PERFORMANCE").filter((k) => k.startsWith("heart.")),
    ),
    fiberType: getOffspringLocus("fiberType", "ATHLETIC"),
    stride: getOffspringLocus("stride", "ATHLETIC"),
    trackBias: getOffspringLocus("trackBias", "TRACK"),
    mudAptitude: getOffspringLocus("mudAptitude", "ENDURANCE"),
    weatherAptitude: getOffspringLocus("weatherAptitude", "ENDURANCE"),
    trainability: getOffspringLocus("trainability", "BEHAVIORAL"),
    peakAge: getOffspringLocus("peakAge", "CONFORMATION"),
    recovery: getOffspringLocus("recovery", "BEHAVIORAL"),
    fertility: crossover(sire.fertility, dam.fertility, rng), // Independent (not in linkage map yet)
    foalingEase: getOffspringLocus("foalingEase", "CONFORMATION"),
    markings: {
      socks: crossover(sire.markings.socks, dam.markings.socks, rng),
      face: crossover(sire.markings.face, dam.markings.face, rng),
      silverDapple: crossover(sire.markings.silverDapple, dam.markings.silverDapple, rng),
      sabino: crossover(sire.markings.sabino, dam.markings.sabino, rng),
      splashWhite: crossover(sire.markings.splashWhite, dam.markings.splashWhite, rng),
    },
    health: {
      bleeder: getOffspringLocus("bleeder", "HEALTH"),
      roarer: getOffspringLocus("roarer", "HEALTH"),
      ocd: getOffspringLocus("ocd", "HEALTH"),
      efna5: getOffspringLocus("efna5", "HEALTH"),
      pssm: getOffspringLocus("pssm", "HEALTH"),
      rer: getOffspringLocus("rer", "HEALTH"),
      epm: getOffspringLocus("epm", "HEALTH"),
    },
  };
}
