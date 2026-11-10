import { describe, it, expect } from "vitest";
import {
  crossoverChromosome,
  crossoverAllChromosomes,
} from "@/domains/genetics/simulation/chromosomes";
import { createRng } from "@/shared/common/rng";
import type { ChromosomeId } from "@/domains/genetics/simulation/chromosomes";
import type { Locus } from "@/shared/common/types";

describe("Chromosomes Crossover", () => {
  it("should generate correct crossover offspring alleles with lengths matching positions", () => {
    const rng = createRng("test_seed"); // Provides deterministic sequence
    const parent1: Locus[] = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    const parent2: Locus[] = [
      [7, 8],
      [9, 10],
      [11, 12],
    ];
    const positions = [0.1, 0.5, 0.9];

    const offspring = crossoverChromosome(parent1, parent2, positions, rng);

    // Result should match the array length
    expect(offspring).toHaveLength(3);

    // Check that each locus takes one allele from parent1 and one from parent2
    offspring.forEach((locus, i) => {
      expect(locus).toHaveLength(2);
      expect(parent1[i].includes(locus[0] as number)).toBeTruthy();
      expect(parent2[i].includes(locus[1] as number)).toBeTruthy();
    });
  });

  it("should throw error if allele arrays length differ from positions length", () => {
    const rng = createRng("test_seed");
    const parent1: Locus[] = [
      [1, 2],
      [3, 4],
    ];
    const parent2: Locus[] = [
      [7, 8],
      [9, 10],
    ];
    const positions = [0.1, 0.5, 0.9];

    expect(() => crossoverChromosome(parent1, parent2, positions, rng)).toThrow(
      "Allele and position arrays must have same length",
    );
  });

  it("should process multiple chromosomes independently", () => {
    const rng = createRng("test_seed_2");

    const map = new Map<
      ChromosomeId,
      { parent1Alleles: Locus[]; parent2Alleles: Locus[]; positions: number[] }
    >();
    map.set("HEALTH", {
      parent1Alleles: [[1, 2]],
      parent2Alleles: [[3, 4]],
      positions: [0.5],
    });
    map.set("COLOR", {
      parent1Alleles: [[5, 6]],
      parent2Alleles: [[7, 8]],
      positions: [0.5],
    });

    const offspringMap = crossoverAllChromosomes(map, rng);

    expect(offspringMap.size).toBe(2);
    expect(offspringMap.has("HEALTH")).toBeTruthy();
    expect(offspringMap.has("COLOR")).toBeTruthy();

    const healthOffspring = offspringMap.get("HEALTH")!;
    expect(healthOffspring).toHaveLength(1);
    expect([1, 2].includes(healthOffspring[0][0] as number)).toBeTruthy();
    expect([3, 4].includes(healthOffspring[0][1] as number)).toBeTruthy();
  });
});
