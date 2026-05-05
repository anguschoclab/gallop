import { describe, it, expect } from "vitest";
import { createRng } from "../game/rng";
import {
  generateGenotype,
  inheritDNA,
  resolveCoatColor,
  resolveStats,
  resolveRunningStyle,
} from "../game/geneticsEngine";

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

  it("should follow Mendelian color inheritance (Chestnut)", () => {
    // Both parents are Chestnut (ee)
    const sireDNA = generateGenotype(rng, "mid");
    sireDNA.color.extension = [0, 0];
    sireDNA.color.agouti = [0, 0];
    sireDNA.color.gray = [0, 0];
    sireDNA.color.cream = [0, 0];

    const damDNA = generateGenotype(rng, "mid");
    damDNA.color.extension = [0, 0];
    damDNA.color.agouti = [0, 0];
    damDNA.color.gray = [0, 0];
    damDNA.color.cream = [0, 0];

    for (let i = 0; i < 20; i++) {
      const foalDNA = inheritDNA(sireDNA, damDNA, createRng(i));
      const color = resolveCoatColor(foalDNA.color);
      // ee x ee base: chestnut variants; mutation (0.5% per allele) can produce black/bay; no gray expected
      expect(color).not.toBe("gray");
      expect(color).not.toBe("white");
    }
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
