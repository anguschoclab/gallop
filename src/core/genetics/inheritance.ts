import type { Genotype, MarkerGenotype } from "./types";
import type { Locus } from "@/core/common/types";
import type { Rng } from "@/core/common/types";
import { crossoverAllChromosomes, type ChromosomeId } from "./chromosomes";
import { LINKAGE_MAP, getLociByChromosome, INDEPENDENTLY_ASSORTING_LOCI } from "./linkageMap";

/**
 * Independent crossover for loci that assort independently
 * Used for markers and color/markings that are not chromosome-linked
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

      // Extract allele from genotype based on key
      let allele: Locus | undefined;
      if (key.startsWith("speed.")) {
        const idx = parseInt(key.split(".")[1]);
        allele = genotype.stats.speed[idx];
      } else if (key.startsWith("stamina.")) {
        const idx = parseInt(key.split(".")[1]);
        allele = genotype.stats.stamina[idx];
      } else if (key.startsWith("acceleration.")) {
        const idx = parseInt(key.split(".")[1]);
        allele = genotype.stats.acceleration[idx];
      } else if (key.startsWith("consistency.")) {
        const idx = parseInt(key.split(".")[1]);
        allele = genotype.stats.consistency[idx];
      } else if (key.startsWith("heart.")) {
        const idx = parseInt(key.split(".")[1]);
        allele = genotype.heart[idx];
      } else if (key === "fiberType") allele = genotype.fiberType;
      else if (key === "stride") allele = genotype.stride;
      else if (key === "style") allele = genotype.style;
      else if (key === "distance") allele = genotype.preferences.distance;
      else if (key === "mudAptitude") allele = genotype.mudAptitude;
      else if (key === "mental") allele = genotype.mental;
      else if (key === "trainability") allele = genotype.trainability;
      else if (key === "recovery") allele = genotype.recovery;
      else if (key === "physical") allele = genotype.physical;
      else if (key === "size") allele = genotype.size;
      else if (key === "durability") allele = genotype.durability;
      else if (key === "peakAge") allele = genotype.peakAge;
      else if (key === "foalingEase") allele = genotype.foalingEase;
      else if (key === "surface") allele = genotype.preferences.surface;
      else if (key === "climbing") allele = genotype.preferences.climbing;
      else if (key === "cornering") allele = genotype.preferences.cornering;
      else if (key === "trackBias") allele = genotype.trackBias;
      else if (key === "bleeder") allele = genotype.health.bleeder;
      else if (key === "roarer") allele = genotype.health.roarer;
      else if (key === "ocd") allele = genotype.health.ocd;
      else if (key === "efna5") allele = genotype.health.efna5;
      else if (key === "pssm") allele = genotype.health.pssm;
      else if (key === "rer") allele = genotype.health.rer;
      else if (key === "epm") allele = genotype.health.epm;
      else if (key === "extension") allele = genotype.color.extension;
      else if (key === "agouti") allele = genotype.color.agouti;
      else if (key === "gray") allele = genotype.color.gray;
      else if (key === "cream") allele = genotype.color.cream;
      else if (key === "socks") allele = genotype.markings.socks;
      else if (key === "face") allele = genotype.markings.face;
      else if (key === "silverDapple") allele = genotype.markings.silverDapple;
      else if (key === "sabino") allele = genotype.markings.sabino;
      else if (key === "splashWhite") allele = genotype.markings.splashWhite;

      if (allele) {
        alleles.push(allele);
        positions.push(coord.position);
      }
    }

    return { alleles, positions };
  };

  // Build chromosome data map
  const chromosomeData = new Map<
    string,
    { parent1Alleles: Locus[]; parent2Alleles: Locus[]; positions: number[] }
  >();

  const chromosomes: string[] = [
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
    if (!offspringAlleles) {
      // Fallback to independent crossover if chromosome not in map
      return locusKeys.map((key) => {
        let sireAllele: Locus | undefined;
        let damAllele: Locus | undefined;

        if (key.startsWith("speed.")) {
          const idx = parseInt(key.split(".")[1]);
          sireAllele = sire.stats.speed[idx];
          damAllele = dam.stats.speed[idx];
        } else if (key.startsWith("stamina.")) {
          const idx = parseInt(key.split(".")[1]);
          sireAllele = sire.stats.stamina[idx];
          damAllele = dam.stats.stamina[idx];
        } else if (key.startsWith("acceleration.")) {
          const idx = parseInt(key.split(".")[1]);
          sireAllele = sire.stats.acceleration[idx];
          damAllele = dam.stats.acceleration[idx];
        } else if (key.startsWith("consistency.")) {
          const idx = parseInt(key.split(".")[1]);
          sireAllele = sire.stats.consistency[idx];
          damAllele = dam.stats.consistency[idx];
        } else if (key.startsWith("heart.")) {
          const idx = parseInt(key.split(".")[1]);
          sireAllele = sire.heart[idx];
          damAllele = dam.heart[idx];
        }

        if (sireAllele && damAllele) {
          return crossover(sireAllele, damAllele, rng);
        }
        return [3, 3]; // Default fallback
      });
    }

    return offspringAlleles;
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
    let sireAllele: Locus | undefined;
    let damAllele: Locus | undefined;

    if (key.startsWith("speed.")) {
      const i = parseInt(key.split(".")[1]);
      sireAllele = sire.stats.speed[i];
      damAllele = dam.stats.speed[i];
    } else if (key === "fiberType") {
      sireAllele = sire.fiberType;
      damAllele = dam.fiberType;
    } else if (key === "stride") {
      sireAllele = sire.stride;
      damAllele = dam.stride;
    } else if (key === "distance") {
      sireAllele = sire.preferences.distance;
      damAllele = dam.preferences.distance;
    } else if (key === "mudAptitude") {
      sireAllele = sire.mudAptitude;
      damAllele = dam.mudAptitude;
    } else if (key === "mental") {
      sireAllele = sire.mental;
      damAllele = dam.mental;
    } else if (key === "trainability") {
      sireAllele = sire.trainability;
      damAllele = dam.trainability;
    } else if (key === "recovery") {
      sireAllele = sire.recovery;
      damAllele = dam.recovery;
    } else if (key === "physical") {
      sireAllele = sire.physical;
      damAllele = dam.physical;
    } else if (key === "size") {
      sireAllele = sire.size;
      damAllele = dam.size;
    } else if (key === "durability") {
      sireAllele = sire.durability;
      damAllele = dam.durability;
    } else if (key === "peakAge") {
      sireAllele = sire.peakAge;
      damAllele = dam.peakAge;
    } else if (key === "foalingEase") {
      sireAllele = sire.foalingEase;
      damAllele = dam.foalingEase;
    } else if (key === "surface") {
      sireAllele = sire.preferences.surface;
      damAllele = dam.preferences.surface;
    } else if (key === "climbing") {
      sireAllele = sire.preferences.climbing;
      damAllele = dam.preferences.climbing;
    } else if (key === "cornering") {
      sireAllele = sire.preferences.cornering;
      damAllele = dam.preferences.cornering;
    } else if (key === "trackBias") {
      sireAllele = sire.trackBias;
      damAllele = dam.trackBias;
    } else if (key === "bleeder") {
      sireAllele = sire.health.bleeder;
      damAllele = dam.health.bleeder;
    } else if (key === "roarer") {
      sireAllele = sire.health.roarer;
      damAllele = dam.health.roarer;
    } else if (key === "ocd") {
      sireAllele = sire.health.ocd;
      damAllele = dam.health.ocd;
    } else if (key === "efna5") {
      sireAllele = sire.health.efna5;
      damAllele = dam.health.efna5;
    } else if (key === "pssm") {
      sireAllele = sire.health.pssm;
      damAllele = dam.health.pssm;
    } else if (key === "rer") {
      sireAllele = sire.health.rer;
      damAllele = dam.health.rer;
    } else if (key === "epm") {
      sireAllele = sire.health.epm;
      damAllele = dam.health.epm;
    } else if (key === "extension") {
      sireAllele = sire.color.extension;
      damAllele = dam.color.extension;
    } else if (key === "agouti") {
      sireAllele = sire.color.agouti;
      damAllele = dam.color.agouti;
    } else if (key === "gray") {
      sireAllele = sire.color.gray;
      damAllele = dam.color.gray;
    } else if (key === "cream") {
      sireAllele = sire.color.cream;
      damAllele = dam.color.cream;
    } else if (key === "socks") {
      sireAllele = sire.markings.socks;
      damAllele = dam.markings.socks;
    } else if (key === "face") {
      sireAllele = sire.markings.face;
      damAllele = dam.markings.face;
    } else if (key === "silverDapple") {
      sireAllele = sire.markings.silverDapple;
      damAllele = dam.markings.silverDapple;
    } else if (key === "sabino") {
      sireAllele = sire.markings.sabino;
      damAllele = dam.markings.sabino;
    } else if (key === "splashWhite") {
      sireAllele = sire.markings.splashWhite;
      damAllele = dam.markings.splashWhite;
    }

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
