import { describe, it, expect } from "vitest";
import { createRng } from "@/game/rng";
import {
  generateGenotype,
  generateDeterministicGenotype,
  generateResearchBasedGenotype,
  inheritDNA,
  resolveCoatColor,
  resolveStats,
  resolveRunningStyle,
  resolveHeartScore,
  resolveFiberBias,
  resolveTrainability,
  resolvePeakAge,
  resolveRecoveryRate,
  resolveFertility,
} from "@/game/geneticsEngine";
import { stallionResearchData } from "@/game/stallionDNAData";

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

describe("Deterministic DNA Generation", () => {
  it("should generate identical DNA for same stallion name (determinism)", () => {
    const dna1 = generateDeterministicGenotype("Secretariat", "elite", ["Brilliant", "Classic"], ["Triple Crown winner"]);
    const dna2 = generateDeterministicGenotype("Secretariat", "elite", ["Brilliant", "Classic"], ["Triple Crown winner"]);
    
    // Compare all DNA fields
    expect(JSON.stringify(dna1)).toBe(JSON.stringify(dna2));
  });

  it("should generate different DNA for different stallion names (variety)", () => {
    const dna1 = generateDeterministicGenotype("Secretariat", "elite", ["Brilliant", "Classic"], ["Triple Crown winner"]);
    const dna2 = generateDeterministicGenotype("Northern Dancer", "elite", ["Brilliant", "Classic"], ["Champion sire"]);
    
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

  it("should apply achievement bonuses (Triple Crown = higher heart)", () => {
    const tripleCrownDNA = generateDeterministicGenotype("TestStallion", "elite", ["Classic"], ["Triple Crown winner"]);
    const noAchievementDNA = generateDeterministicGenotype("TestStallion2", "elite", ["Classic"], []);
    
    // Triple Crown winner should have boosted heart loci
    const tripleCrownHeartSum = tripleCrownDNA.heart.reduce((sum, l) => sum + l[0] + l[1], 0);
    const noAchievementHeartSum = noAchievementDNA.heart.reduce((sum, l) => sum + l[0] + l[1], 0);
    
    expect(tripleCrownHeartSum).toBeGreaterThan(noAchievementHeartSum);
  });

  it("should maintain tier-based quality floor", () => {
    const eliteDNA = generateDeterministicGenotype("TestStallion", "elite", ["Classic"]);
    const budgetDNA = generateDeterministicGenotype("TestStallion2", "budget", ["Classic"]);
    
    const eliteStats = resolveStats(eliteDNA.stats);
    const budgetStats = resolveStats(budgetDNA.stats);
    
    // Elite should have higher stats than budget
    expect(eliteStats.speed).toBeGreaterThan(budgetStats.speed);
  });

  it("should handle missing dosage groups gracefully", () => {
    const dna = generateDeterministicGenotype("TestStallion", "elite", undefined, ["Triple Crown winner"]);
    
    // Should still generate valid DNA
    expect(dna).toBeDefined();
    expect(dna.stats).toBeDefined();
  });

  it("should handle missing achievements gracefully", () => {
    const dna = generateDeterministicGenotype("TestStallion", "elite", ["Brilliant"], undefined);
    
    // Should still generate valid DNA
    expect(dna).toBeDefined();
    expect(dna.stats).toBeDefined();
  });
});

describe("Research-Based DNA Generation", () => {
  it("should use research data for stallions with complete data", () => {
    // Secretariat has research data in stallionDNAData.ts
    const secretariatDNA = generateResearchBasedGenotype("Secretariat", "elite");
    
    // Should generate valid DNA
    expect(secretariatDNA).toBeDefined();
    expect(secretariatDNA.stats).toBeDefined();
    
    // Secretariat's height (16.2 hands) should map to size locus
    // 16.2h maps to approximately locus 6 (16.2 - 14.0 = 2.2, 2.2/4.0 = 0.55, 0.55*9 + 1 = 5.95 ≈ 6)
    const sizeSum = secretariatDNA.size[0] + secretariatDNA.size[1];
    expect(sizeSum).toBeGreaterThanOrEqual(10); // Should be at least default
  });

  it("should fall back to deterministic for stallions without research data", () => {
    // RandomStallion has no research data
    const randomDNA = generateResearchBasedGenotype("RandomStallionXYZ", "elite");
    
    // Should still generate valid DNA via fallback
    expect(randomDNA).toBeDefined();
    expect(randomDNA.stats).toBeDefined();
  });

  it("should apply research data traits correctly", () => {
    // Secretariat has excellent conformation and temperament
    const secretariatDNA = generateResearchBasedGenotype("Secretariat", "elite");
    
    // Excellent conformation should map to high physical locus (9)
    const physicalSum = secretariatDNA.physical[0] + secretariatDNA.physical[1];
    expect(physicalSum).toBeGreaterThan(15); // Should be high
    
    // Excellent temperament should map to high mental locus (9)
    const mentalSum = secretariatDNA.mental[0] + secretariatDNA.mental[1];
    expect(mentalSum).toBeGreaterThan(15); // Should be high
  });

  it("should apply research data racing preferences", () => {
    // Secretariat has classic distance preference, dirt surface, E style
    const secretariatDNA = generateResearchBasedGenotype("Secretariat", "elite");
    
    // Classic distance should map to high distance locus (8)
    const distanceSum = secretariatDNA.preferences.distance[0] + secretariatDNA.preferences.distance[1];
    expect(distanceSum).toBeGreaterThan(12); // Should be high
    
    // Dirt surface should map to high surface locus (8)
    const surfaceSum = secretariatDNA.preferences.surface[0] + secretariatDNA.preferences.surface[1];
    expect(surfaceSum).toBeGreaterThan(10); // Should be high
    
    // E style should map to style locus 1
    const styleSum = secretariatDNA.style[0] + secretariatDNA.style[1];
    expect(styleSum).toBeLessThan(4); // Should be low (E = 1)
  });

  it("should produce consistent DNA for same stallion", () => {
    const dna1 = generateResearchBasedGenotype("Secretariat", "elite");
    const dna2 = generateResearchBasedGenotype("Secretariat", "elite");
    
    // Research-based should be deterministic
    expect(JSON.stringify(dna1)).toBe(JSON.stringify(dna2));
  });

  it("should produce different DNA for different stallions", () => {
    const secretariatDNA = generateResearchBasedGenotype("Secretariat", "elite");
    const northernDancerDNA = generateResearchBasedGenotype("Northern Dancer", "elite");

    // Should have different DNA
    expect(JSON.stringify(secretariatDNA)).not.toBe(JSON.stringify(northernDancerDNA));
  });
});

describe("Research Data Validation", () => {
  it("should validate all researched stallions produce reasonable DNA", () => {
    let validationErrors: string[] = [];

    for (const [stallionName, researchData] of stallionResearchData.entries()) {
      // Skip duplicate entries (marked with "- duplicate skip" suffix)
      if (stallionName.includes("- duplicate skip")) continue;

      try {
        const dna = generateResearchBasedGenotype(stallionName, "elite");
        const stats = resolveStats(dna.stats);
        const heartScore = resolveHeartScore(dna.heart);
        const fiberBias = resolveFiberBias(dna.fiberType);
        const trainability = resolveTrainability(dna.trainability);
        const peakAge = resolvePeakAge(dna.peakAge);
        const recoveryRate = resolveRecoveryRate(dna.recovery);
        const fertility = resolveFertility(dna.fertility);

        // Validate stats are in reasonable ranges
        if (stats.speed < 20 || stats.speed > 100) {
          validationErrors.push(`${stallionName}: Invalid speed ${stats.speed}`);
        }
        if (stats.stamina < 20 || stats.stamina > 100) {
          validationErrors.push(`${stallionName}: Invalid stamina ${stats.stamina}`);
        }
        if (stats.acceleration < 20 || stats.acceleration > 100) {
          validationErrors.push(`${stallionName}: Invalid acceleration ${stats.acceleration}`);
        }
        if (stats.consistency < 20 || stats.consistency > 100) {
          validationErrors.push(`${stallionName}: Invalid consistency ${stats.consistency}`);
        }

        // Validate derived traits are in reasonable ranges
        if (heartScore < 0.85 || heartScore > 1.15) {
          validationErrors.push(`${stallionName}: Invalid heart score ${heartScore}`);
        }
        if (trainability < 0.5 || trainability > 1.4) {
          validationErrors.push(`${stallionName}: Invalid trainability ${trainability}`);
        }
        if (peakAge < 3 || peakAge > 7) {
          validationErrors.push(`${stallionName}: Invalid peak age ${peakAge}`);
        }
        if (recoveryRate < 0.7 || recoveryRate > 1.4) {
          validationErrors.push(`${stallionName}: Invalid recovery rate ${recoveryRate}`);
        }
        if (fertility < 0.7 || fertility > 0.99) {
          validationErrors.push(`${stallionName}: Invalid fertility ${fertility}`);
        }

        // Validate fiber bias is one of the expected values
        if (!["sprinter", "balanced", "stayer"].includes(fiberBias)) {
          validationErrors.push(`${stallionName}: Invalid fiber bias ${fiberBias}`);
        }
      } catch (error) {
        validationErrors.push(`${stallionName}: Error generating DNA - ${error}`);
      }
    }

    // Report any validation errors
    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      expect(validationErrors.length).toBe(0);
    }
  });

  it("should have consistent data structure across all research entries", () => {
    let structureErrors: string[] = [];

    for (const [stallionName, researchData] of stallionResearchData.entries()) {
      // Skip duplicate entries
      if (stallionName.includes("- duplicate skip")) continue;

      // Validate name field
      if (!researchData.name || typeof researchData.name !== "string") {
        structureErrors.push(`${stallionName}: Missing or invalid name`);
      }

      // Validate physical traits if present
      if (researchData.physicalTraits) {
        if (researchData.physicalTraits.height && (researchData.physicalTraits.height < 14 || researchData.physicalTraits.height > 18)) {
          structureErrors.push(`${stallionName}: Invalid height ${researchData.physicalTraits.height}`);
        }
        if (researchData.physicalTraits.conformation && !["excellent", "good", "fair", "poor"].includes(researchData.physicalTraits.conformation)) {
          structureErrors.push(`${stallionName}: Invalid conformation ${researchData.physicalTraits.conformation}`);
        }
        if (researchData.physicalTraits.temperament && !["excellent", "good", "fair", "poor"].includes(researchData.physicalTraits.temperament)) {
          structureErrors.push(`${stallionName}: Invalid temperament ${researchData.physicalTraits.temperament}`);
        }
      }

      // Validate racing performance if present
      if (researchData.racingPerformance) {
        if (researchData.racingPerformance.distancePreference && !["sprint", "mile", "classic", "stayer"].includes(researchData.racingPerformance.distancePreference)) {
          structureErrors.push(`${stallionName}: Invalid distancePreference ${researchData.racingPerformance.distancePreference}`);
        }
        if (researchData.racingPerformance.surfacePreference && !["dirt", "turf", "synthetic"].includes(researchData.racingPerformance.surfacePreference)) {
          structureErrors.push(`${stallionName}: Invalid surfacePreference ${researchData.racingPerformance.surfacePreference}`);
        }
        if (researchData.racingPerformance.runningStyle && !["E", "EP", "P", "S"].includes(researchData.racingPerformance.runningStyle)) {
          structureErrors.push(`${stallionName}: Invalid runningStyle ${researchData.racingPerformance.runningStyle}`);
        }
      }

      // Validate research confidence if present
      if (researchData.researchConfidence && !["high", "medium", "low"].includes(researchData.researchConfidence)) {
        structureErrors.push(`${stallionName}: Invalid researchConfidence ${researchData.researchConfidence}`);
      }
    }

    // Report any structure errors
    if (structureErrors.length > 0) {
      console.error("Structure errors:", structureErrors);
      expect(structureErrors.length).toBe(0);
    }
  });
});
