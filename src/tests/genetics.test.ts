import { describe, it, expect } from "vitest";
import { createRng } from "@/game/rng";
import {
  generateGenotype,
  generateDeterministicGenotype,
  generateResearchBasedGenotype,
} from "@/core/genetics/generation";
import {
  resolveCoatColor,
  resolveStats,
  resolveRunningStyle,
  resolveHeartScore,
  resolveFiberBias,
  resolveTrainability,
  resolvePeakAge,
  resolveRecoveryRate,
  resolveFertility,
} from "@/core/genetics/phenotype";
import { inheritDNA } from "@/core/genetics/inheritance";
import { stallionResearchData } from "@/core/data/stallionDNAData";

describe("Universal DNA System", () => {
  const rng = createRng(123);

  it("should generate balanced initial genotypes", () => {
    const dna = generateGenotype(rng, "elite");
    const stats = resolveStats(dna.stats);

    expect(stats.speed).toBeGreaterThanOrEqual(20);
    expect(stats.speed).toBeLessThanOrEqual(100);
    expect(stats.speed).toBeGreaterThan(60); // Elite should be high
  });

  it("should follow Mendelian color inheritance (Gray)", () => {
    // Both parents are heterozygous Gray (Gg)
    const sireDNA = generateGenotype(rng, "mid");
    sireDNA.color.gray = [1, 0];

    const damDNA = generateGenotype(rng, "mid");
    damDNA.color.gray = [1, 0];

    let foundGray = 0;
    let foundNonGray = 0;

    for (let i = 0; i < 100; i++) {
      const foalDNA = inheritDNA(sireDNA, damDNA, createRng(i));
      const color = resolveCoatColor(foalDNA.color);
      if (color === "gray") foundGray++;
      else foundNonGray++;
    }

    // Expect roughly 75% Gray, 25% Non-Gray
    expect(foundGray).toBeGreaterThan(60);
    expect(foundNonGray).toBeGreaterThan(15);
  });

  it("should maintain statistical variance in offspring", () => {
    const sireDNA = generateGenotype(rng, "elite");
    const damDNA = generateGenotype(rng, "budget");

    const sireSpeed = resolveStats(sireDNA.stats).speed;
    const damSpeed = resolveStats(damDNA.stats).speed;

    let totalSpeed = 0;
    const speeds: number[] = [];

    for (let i = 0; i < 50; i++) {
      const foalDNA = inheritDNA(sireDNA, damDNA, createRng(i));
      const s = resolveStats(foalDNA.stats).speed;
      totalSpeed += s;
      speeds.push(s);
    }

    const avgSpeed = totalSpeed / 50;
    expect(avgSpeed).toBeGreaterThan(damSpeed - 5);
    expect(avgSpeed).toBeLessThan(sireSpeed + 5);

    // Ensure not every foal is the same
    const uniqueSpeeds = new Set(speeds);
    expect(uniqueSpeeds.size).toBeGreaterThan(5);
  });
});

describe("Deterministic DNA Generation", () => {
  it("should generate identical DNA for same stallion name (determinism)", () => {
    const dna1 = generateDeterministicGenotype(
      "Secretariat",
      "elite",
      ["Brilliant", "Classic"],
      ["Triple Crown winner"],
    );
    const dna2 = generateDeterministicGenotype(
      "Secretariat",
      "elite",
      ["Brilliant", "Classic"],
      ["Triple Crown winner"],
    );

    // Compare all DNA fields
    expect(JSON.stringify(dna1)).toBe(JSON.stringify(dna2));
  });

  it("should generate different DNA for different stallion names (variety)", () => {
    const dna1 = generateDeterministicGenotype(
      "Secretariat",
      "elite",
      ["Brilliant", "Classic"],
      ["Triple Crown winner"],
    );
    const dna2 = generateDeterministicGenotype(
      "Northern Dancer",
      "elite",
      ["Brilliant", "Classic"],
      ["Champion sire"],
    );

    // Should have different DNA
    expect(JSON.stringify(dna1)).not.toBe(JSON.stringify(dna2));

    // Specifically check stats are different
    const stats1 = resolveStats(dna1.stats);
    const stats2 = resolveStats(dna2.stats);
    expect(stats1.speed).not.toBe(stats2.speed);
  });

  it("should apply dosage bias correctly (Brilliant = higher speed)", () => {
    const brilliantDNA = generateDeterministicGenotype("TestStallion", "elite", ["Brilliant"]);
    const solidDNA = generateDeterministicGenotype("TestStallion2", "elite", ["Solid"]);

    const brilliantStats = resolveStats(brilliantDNA.stats);
    const solidStats = resolveStats(solidDNA.stats);

    // Brilliant should have higher speed bias than Solid
    expect(brilliantStats.speed).toBeGreaterThan(solidStats.speed);
    expect(solidStats.stamina).toBeGreaterThan(brilliantStats.stamina);
  });
});

describe("Research-Based DNA Generation", () => {
  it("should use research data for stallions with complete data", () => {
    const secretariatDNA = generateResearchBasedGenotype("Secretariat", "elite");
    expect(secretariatDNA).toBeDefined();
    expect(secretariatDNA.stats).toBeDefined();
  });

  it("should apply research data traits correctly", () => {
    const secretariatDNA = generateResearchBasedGenotype("Secretariat", "elite");
    const physicalSum = secretariatDNA.physical[0] + secretariatDNA.physical[1];
    expect(physicalSum).toBeGreaterThan(15);
    const mentalSum = secretariatDNA.mental[0] + secretariatDNA.mental[1];
    expect(mentalSum).toBeGreaterThan(15);
  });
});
