import { describe, it, expect } from "vitest";
import { createRng } from "../game/rng";
import { generateGenotype, inheritDNA, resolveCoatColor, resolveStats, resolveSize, resolveInjuryProneness } from "../game/geneticsEngine";

describe("Universal DNA System - Final Validation", () => {
  const rng = createRng(123);

  it("should resolve realistic biometrics", () => {
    const dna = generateGenotype(rng, "mid");
    const { height, weight } = resolveSize(dna.size);
    
    // Range based on 15.0 - 17.0 hands
    expect(height).toBeGreaterThanOrEqual(15.0);
    expect(height).toBeLessThanOrEqual(17.2); // Accounting for Zenyatta range
    
    // Range based on 400 - 580 kg
    expect(weight).toBeGreaterThanOrEqual(400);
    expect(weight).toBeLessThanOrEqual(600);
  });

  it("should resolve durability as injury proneness", () => {
    const dna = generateGenotype(rng, "elite");
    const proneness = resolveInjuryProneness(dna.durability);
    
    // Max proneness is 0.1, Min is 0.02
    expect(proneness).toBeGreaterThanOrEqual(0.01);
    expect(proneness).toBeLessThanOrEqual(0.12);
  });

  it("should follow Mendelian size inheritance", () => {
    // Large Sire (10, 10) x Small Dam (1, 1) -> Mid-size offspring (likely 5, 5)
    const sireDNA = generateGenotype(rng, "elite");
    sireDNA.size = [5, 5];
    
    const damDNA = generateGenotype(rng, "elite");
    damDNA.size = [1, 1];

    const foalDNA = inheritDNA(sireDNA, damDNA, createRng(456));
    const { height: sireH } = resolveSize(sireDNA.size);
    const { height: damH } = resolveSize(damDNA.size);
    const { height: foalH } = resolveSize(foalDNA.size);

    // Foal should be between parents
    expect(foalH).toBeGreaterThan(damH - 0.1);
    expect(foalH).toBeLessThan(sireH + 0.1);
  });
});
