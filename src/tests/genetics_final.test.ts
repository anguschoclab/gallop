import { describe, it, expect } from "vitest";
import { createRng } from "@/game/rng";
import {
  generateGenotype,
  generateDeterministicGenotype,
  inheritDNA,
  resolveCoatColor,
  resolveStats,
  resolveSize,
  resolveInjuryProneness,
} from "@/game/geneticsEngine";

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

  it("should validate Triple Crown achievement bonuses", () => {
    const tripleCrownDNA = generateDeterministicGenotype("TripleCrownTest", "elite", ["Classic"], ["Triple Crown winner"]);
    const noAchievementDNA = generateDeterministicGenotype("NoAchievementTest", "elite", ["Classic"], []);
    
    // Triple Crown winner should have boosted heart
    const tripleCrownHeartSum = tripleCrownDNA.heart.reduce((sum, l) => sum + l[0] + l[1], 0);
    const noAchievementHeartSum = noAchievementDNA.heart.reduce((sum, l) => sum + l[0] + l[1], 0);
    expect(tripleCrownHeartSum).toBeGreaterThan(noAchievementHeartSum);
    
    // Triple Crown winner should have boosted trainability
    expect(tripleCrownDNA.trainability[0] + tripleCrownDNA.trainability[1])
      .toBeGreaterThan(noAchievementDNA.trainability[0] + noAchievementDNA.trainability[1]);
  });

  it("should validate Champion sire achievement bonuses", () => {
    const championSireDNA = generateDeterministicGenotype("ChampionSireTest", "elite", ["Classic"], ["Champion sire"]);
    const noAchievementDNA = generateDeterministicGenotype("NoAchievementTest", "elite", ["Classic"], []);
    
    // Champion sire should have boosted fertility
    expect(championSireDNA.fertility[0] + championSireDNA.fertility[1])
      .toBeGreaterThan(noAchievementDNA.fertility[0] + noAchievementDNA.fertility[1]);
  });

  it("should validate sprinter achievement bonuses", () => {
    const sprinterDNA = generateDeterministicGenotype("SprinterTest", "elite", ["Brilliant"], ["sprint"]);
    const noAchievementDNA = generateDeterministicGenotype("NoAchievementTest", "elite", ["Brilliant"], []);
    
    const sprinterStats = resolveStats(sprinterDNA.stats);
    const noAchievementStats = resolveStats(noAchievementDNA.stats);
    
    // Sprinter should have higher speed
    expect(sprinterStats.speed).toBeGreaterThan(noAchievementStats.speed);
    
    // Sprinter should have lower stamina
    expect(sprinterStats.stamina).toBeLessThan(noAchievementStats.stamina);
  });

  it("should validate stayer achievement bonuses", () => {
    const stayerDNA = generateDeterministicGenotype("StayerTest", "elite", ["Solid"], ["stayer"]);
    const noAchievementDNA = generateDeterministicGenotype("NoAchievementTest", "elite", ["Solid"], []);
    
    const stayerStats = resolveStats(stayerDNA.stats);
    const noAchievementStats = resolveStats(noAchievementDNA.stats);
    
    // Stayer should have higher stamina
    expect(stayerStats.stamina).toBeGreaterThan(noAchievementStats.stamina);
    
    // Stayer should have lower speed
    expect(stayerStats.speed).toBeLessThan(noAchievementStats.speed);
  });
});
