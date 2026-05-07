import type { Genotype, Locus, MarkerGenotype } from "./types";
import type { Rng } from "@/core/common/types";

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

  // Leopard complex
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

  // Lethal carriers
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
