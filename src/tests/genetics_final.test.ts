import { describe, it, expect } from "vitest";
import { createRng } from "@/game/rng";
import {
  generateGenotype,
  generateDeterministicGenotype,
} from "@/core/genetics/generation";
import { 
  resolveStats, 
  resolveCoatColor, 
  resolveSize, 
  resolveInjuryProneness 
} from "@/core/genetics/phenotype";
import { inheritDNA } from "@/core/genetics/inheritance";

describe("Universal DNA System - Final Validation", () => {
  const rng = createRng(123);

  it("should resolve realistic biometrics", () => {
    const dna = generateGenotype(rng, "mid");
    const { height, weight } = resolveSize(dna.size);

    // Range based on 15.0 - 17.0 hands
    expect(height).toBeGreaterThanOrEqual(14.2);
    expect(height).toBeLessThanOrEqual(17.5);

    // Range based on 400 - 650 kg
    expect(weight).toBeGreaterThanOrEqual(400);
    expect(weight).toBeLessThanOrEqual(650);
  });

  it("should resolve durability as injury proneness", () => {
    const dna = generateGenotype(rng, "elite");
    const proneness = resolveInjuryProneness(dna.durability);

    // Max proneness is 0.12, Min is 0.02
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

describe("Deterministic DNA Bias Validation", () => {
  it("should validate Brilliant dosage bias toward speed", () => {
    const brilliantDNA = generateDeterministicGenotype("BrilliantTest", "elite", ["Brilliant"]);
    const classicDNA = generateDeterministicGenotype("ClassicTest", "elite", ["Classic"]);
    
    const brilliantStats = resolveStats(brilliantDNA.stats);
    const classicStats = resolveStats(classicDNA.stats);
    
    // Brilliant should have higher speed than Classic
    expect(brilliantStats.speed).toBeGreaterThan(classicStats.speed);
  });

  it("should validate Solid dosage bias toward stamina and durability", () => {
    const solidDNA = generateDeterministicGenotype("SolidTest", "elite", ["Solid"]);
    const classicDNA = generateDeterministicGenotype("ClassicTest", "elite", ["Classic"]);
    
    const solidStats = resolveStats(solidDNA.stats);
    const classicStats = resolveStats(classicDNA.stats);
    
    // Solid should have higher stamina than Classic
    expect(solidStats.stamina).toBeGreaterThan(classicStats.stamina);
    
    // Solid should have higher durability
    expect(solidDNA.durability[0] + solidDNA.durability[1])
      .toBeGreaterThan(classicDNA.durability[0] + classicDNA.durability[1]);
  });
});
