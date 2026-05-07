/**
 * Chromosome Model for Genetic Inheritance
 * Implements chromosome-based crossover with linkage groups
 */

import type { Rng } from "@/game/rng";
import type { Locus } from "./types";

/**
 * Chromosome identifiers
 * 9 chromosomes covering all genetic loci
 */
export type ChromosomeId =
  | "ATHLETIC"
  | "ENDURANCE"
  | "PERFORMANCE"
  | "BEHAVIORAL"
  | "CONFORMATION"
  | "TRACK"
  | "HEALTH"
  | "COLOR"
  | "MARKINGS";

/**
 * Locus coordinate on a chromosome
 * position: 0-1, position along chromosome (0 = telomere start, 1 = telomere end)
 */
export type LocusCoord = {
  chromosome: ChromosomeId;
  position: number;
};

/**
 * Single crossover event on a chromosome
 * crossoverPoint: 0-1, where crossover occurs
 */
export type CrossoverEvent = {
  chromosome: ChromosomeId;
  crossoverPoint: number;
};

/**
 * Perform chromosome-aware crossover for a single chromosome
 *
 * @param parent1Alleles - First parent's alleles for loci on this chromosome
 * @param parent2Alleles - Second parent's alleles for loci on this chromosome
 * @param positions - Position of each locus on chromosome (0-1)
 * @param rng - Random number generator
 * @returns Offspring alleles for this chromosome
 */
export function crossoverChromosome(
  parent1Alleles: Locus[],
  parent2Alleles: Locus[],
  positions: number[],
  rng: Rng,
): Locus[] {
  if (
    parent1Alleles.length !== parent2Alleles.length ||
    parent1Alleles.length !== positions.length
  ) {
    throw new Error("Allele and position arrays must have same length");
  }

  // Draw crossover points for each parent independently
  // Each parent has two homologous chromosomes (represented by Locus[0] and Locus[1])
  const cp1 = rng.next();
  const cp2 = rng.next();

  // Pick which strand each parent starts with (0 or 1)
  const startStrand1 = rng.next() < 0.5 ? 0 : 1;
  const startStrand2 = rng.next() < 0.5 ? 0 : 1;

  const offspringAlleles: Locus[] = [];
  for (let i = 0; i < parent1Alleles.length; i++) {
    // Parent 1 allele: swap strand if past crossover point
    const strand1 = positions[i] < cp1 ? startStrand1 : 1 - startStrand1;
    const a1 = parent1Alleles[i][strand1];

    // Parent 2 allele: swap strand if past crossover point
    const strand2 = positions[i] < cp2 ? startStrand2 : 1 - startStrand2;
    const a2 = parent2Alleles[i][strand2];

    offspringAlleles.push([a1, a2]);
  }

  return offspringAlleles;
}

/**
 * Perform crossover for multiple chromosomes independently
 * Each chromosome segregates independently with its own crossover point
 *
 * @param chromosomeData - Map of chromosome ID to parent alleles and positions
 * @param rng - Random number generator
 * @returns Map of chromosome ID to offspring alleles
 */
export function crossoverAllChromosomes(
  chromosomeData: Map<
    ChromosomeId,
    { parent1Alleles: Locus[]; parent2Alleles: Locus[]; positions: number[] }
  >,
  rng: Rng,
): Map<ChromosomeId, Locus[]> {
  const offspringMap = new Map<ChromosomeId, Locus[]>();

  for (const [chromosomeId, data] of chromosomeData) {
    const offspringAlleles = crossoverChromosome(
      data.parent1Alleles,
      data.parent2Alleles,
      data.positions,
      rng,
    );
    offspringMap.set(chromosomeId, offspringAlleles);
  }

  return offspringMap;
}
