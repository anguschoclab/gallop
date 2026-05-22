/**
 * phenotype/health.ts - Health risk and genetic marker resolution
 *
 * Dependencies: ../types (Genotype, HealthGenotype), @/core/common/types (Locus), @/core/horse/types (GeneticMarkers, HealthStatus)
 */

import type { Genotype, HealthGenotype } from "../types";
import type { Locus } from "@/core/common/types";
import type { GeneticMarkers, HealthStatus } from "@/core/horse/types";

/**
 * Resolve genetic markers from genotype.
 *
 * Extracts genetic markers from the genotype.
 *
 * @param genotype - Complete genotype
 * @returns Genetic markers
 *
 * @example
 * const markers = resolveGeneticMarkers(genotype);
 */
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

/**
 * Resolve health status from health genotype.
 *
 * Returns the horse's health status (currently always "healthy").
 *
 * @param health - Health genotype
 * @returns Health status
 *
 * @example
 * const status = resolveHealthStatus(genotype.health);
 */
export function resolveHealthStatus(health: HealthGenotype): HealthStatus {
  // Logic could be expanded to check for immediate health issues from genetics,
  // but for now, we initialize all horses as "healthy".
  return "healthy";
}

/**
 * Resolve racing viability from locus.
 *
 * Returns whether the horse is viable for racing based on locus sum.
 *
 * @param locus - Locus
 * @returns Racing viability
 *
 * @example
 * const viable = resolveRacingViable(genotype.durability);
 */
export function resolveRacingViable(locus: Locus): boolean {
  return locus[0] + locus[1] >= 4;
}

/**
 * Resolve bleeder risk from locus.
 *
 * Returns risk of exercise-induced pulmonary hemorrhage (0.01-0.15).
 *
 * @param locus - Bleeder locus
 * @returns Bleeder risk
 *
 * @example
 * const risk = resolveBleederRisk(genotype.health.bleeder);
 */
export function resolveBleederRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.15;
  if (sum <= 5) return 0.05;
  return 0.01;
}

/**
 * Resolve roarer risk from locus.
 *
 * Returns risk of laryngeal hemiplegia (0-0.1).
 *
 * @param locus - Roarer locus
 * @returns Roarer risk
 *
 * @example
 * const risk = resolveRoarerRisk(genotype.health.roarer);
 */
export function resolveRoarerRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.1;
  if (sum <= 6) return 0.03;
  return 0;
}

/**
 * Resolve PSSM risk from locus.
 *
 * Returns risk of polysaccharide storage myopathy (0-0.15).
 *
 * @param locus - PSSM locus
 * @returns PSSM risk
 *
 * @example
 * const risk = resolvePssmRisk(genotype.health.pssm);
 */
export function resolvePssmRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.15;
  if (sum <= 6) return 0.05;
  return 0;
}

/**
 * Resolve RER risk from locus.
 *
 * Returns risk of recurrent exertional rhabdomyolysis (0-0.12).
 *
 * @param locus - RER locus
 * @returns RER risk
 *
 * @example
 * const risk = resolveRerRisk(genotype.health.rer);
 */
export function resolveRerRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.12;
  if (sum <= 6) return 0.05;
  return 0;
}

/**
 * Resolve EPM risk from locus.
 *
 * Returns risk of equine protozoal myeloencephalitis susceptibility (0-0.1).
 *
 * @param locus - EPM locus
 * @returns EPM risk
 *
 * @example
 * const risk = resolveEpmRisk(genotype.health.epm);
 */
export function resolveEpmRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.1;
  if (sum <= 6) return 0.04;
  return 0;
}

/**
 * Compute heterozygosity from genotype.
 *
 * Calculates the percentage of heterozygous loci as a fitness marker.
 *
 * @param genotype - Complete genotype
 * @returns Heterozygosity percentage (0-1)
 *
 * @example
 * const heterozygosity = computeHeterozygosity(genotype);
 */
export function computeHeterozygosity(genotype: Genotype): number {
  // Calculate percentage of heterozygous loci
  // This is a simplified fitness marker
  let totalLoci = 0;
  let heteroLoci = 0;

  const checkLocus = (l: Locus) => {
    totalLoci++;
    if (l[0] !== l[1]) heteroLoci++;
  };

  const checkLoci = (loci: Locus[]) => loci.forEach(checkLocus);

  checkLoci(genotype.stats.speed);
  checkLoci(genotype.stats.stamina);
  checkLoci(genotype.stats.acceleration);
  checkLoci(genotype.stats.consistency);
  checkLoci(genotype.heart);
  checkLocus(genotype.color.extension);
  checkLocus(genotype.color.agouti);
  checkLocus(genotype.color.gray);
  checkLocus(genotype.color.cream);
  checkLocus(genotype.preferences.distance);
  checkLocus(genotype.preferences.surface);

  return heteroLoci / totalLoci;
}
