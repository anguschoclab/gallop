/**
 * phenotype/stats.ts - Stat resolution from stat genotype
 *
 * Dependencies: ../types (StatGenotype), @/core/common/types (Locus), @/core/horse/types (HorseStats)
 */

import type { StatGenotype } from "../types";
import type { Locus } from "@/core/common/types";
import type { HorseStats } from "@/core/horse/types";

// --- Stat Resolution ---
function sumLoci(loci: Locus[]): number {
  const sum = loci.reduce((acc, [a1, a2]) => acc + a1 + a2, 0);
  return Math.min(100, Math.max(1, sum));
}

/**
 * Resolve horse stats from stat genotype.
 *
 * Sums the loci for each stat and clamps to 1-100 range.
 *
 * @param stats - Stat genotype
 * @param conformation - Optional resolved conformation score
 * @param temperament - Optional resolved temperament score
 * @returns Horse stats
 *
 * @example
 * const stats = resolveStats(genotype.stats, 75, 80);
 */
export function resolveStats(
  stats: StatGenotype,
  conformation: number = 50,
  temperament: number = 50,
): HorseStats {
  return {
    speed: sumLoci(stats.speed),
    stamina: sumLoci(stats.stamina),
    acceleration: sumLoci(stats.acceleration),
    consistency: sumLoci(stats.consistency),
    temperament,
    conformation,
  };
}
