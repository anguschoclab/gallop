import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  computeGenomeModifiers,
  classifyCoi,
  inbreedingPerformanceDampener,
  computeProspectiveCoi,
  detectInbreedingPattern,
  computeAhc,
  computeCoiFromSnapshot,
  resolveBloodline,
} from "@/core/breeding/populationGenetics";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { clearAllCaches, getCacheStats } from "@/core/genetics/genotypeCache";

describe("populationGenetics", () => {
  beforeEach(() => {
    clearAllCaches();
  });

  afterEach(() => {
    clearAllCaches();
  });

  describe("classifyCoi", () => {
    it("maps values to correct tiers", () => {
      expect(classifyCoi(0.01)).toBe("outcross");
      expect(classifyCoi(0.03)).toBe("linebreeding");
      expect(classifyCoi(0.06)).toBe("close-inbreeding");
    });
  });

  describe("inbreedingPerformanceDampener", () => {
    it("penalizes close inbreeding patterns heavily", () => {
      expect(inbreedingPerformanceDampener({ sireGen: 2, damGen: 2 })).toBe(5);
      expect(inbreedingPerformanceDampener({ sireGen: 2, damGen: 3 })).toBe(5);
    });

    it("penalizes linebreeding lightly", () => {
      expect(inbreedingPerformanceDampener({ sireGen: 3, damGen: 3 })).toBe(2);
      expect(inbreedingPerformanceDampener({ sireGen: 2, damGen: 4 })).toBe(2);
    });

    it("does not penalize distant outcrosses", () => {
      expect(inbreedingPerformanceDampener({ sireGen: 4, damGen: 4 })).toBe(0);
      expect(inbreedingPerformanceDampener(undefined)).toBe(0);
    });
  });

  describe("computeGenomeModifiers", () => {
    it("applies outcross modifiers with zero depression penalty", () => {
      const modifiers = computeGenomeModifiers(0.01, 0.5);
      expect(modifiers.depressionPenalty).toBe(0);
      expect(modifiers.prepotency).toBe(0.3);
      expect(modifiers.vigorBonus).toBe(0.05);
      expect(modifiers.longevityBonus).toBe(1.0);
      expect(modifiers.ffs1RiskMultiplier).toBe(1.0);
    });

    it("applies linebreeding modifiers with moderate prepotency and small penalties", () => {
      const modifiers = computeGenomeModifiers(0.04, 0.0);
      expect(modifiers.depressionPenalty).toBeGreaterThan(0);
      expect(modifiers.prepotency).toBe(0.45);
      expect(modifiers.vigorBonus).toBe(0.02);
      expect(modifiers.longevityBonus).toBe(0.5);
    });

    it("applies close-inbreeding modifiers with high prepotency and significant depression penalty", () => {
      const modifiers = computeGenomeModifiers(0.1, 0.0);
      expect(modifiers.depressionPenalty).toBeGreaterThan(0.1);
      expect(modifiers.prepotency).toBeGreaterThan(0.6);
      expect(modifiers.vigorBonus).toBe(0);
      expect(modifiers.longevityBonus).toBe(0);
      expect(modifiers.ffs1RiskMultiplier).toBe(1.5);
    });

    it("reduces depression penalty based on AHC (Ancestral History Coefficient)", () => {
      const noRelief = computeGenomeModifiers(0.1, 0.0);
      const highRelief = computeGenomeModifiers(0.1, 1.0);
      expect(highRelief.depressionPenalty).toBeLessThan(noRelief.depressionPenalty);
      expect(highRelief.depressionPenalty).toBeCloseTo(noRelief.depressionPenalty * 0.5, 3);
    });
  });

  describe("detectInbreedingPattern", () => {
    it("returns undefined for no duplication", () => {
      const pedigree = {
        sireId: "sire",
        damId: "dam",
        sirePedigree: { sireId: "sireSire", damId: "sireDam", generation: 1 },
        damPedigree: { sireId: "damSire", damId: "damDam", generation: 1 },
        generation: 0,
      };
      expect(detectInbreedingPattern(pedigree as any)).toBeUndefined();
    });

    it("detects 2x2 inbreeding (common ancestor is grandparent on both sides)", () => {
      const commonAncestorId = "common";
      const pedigree = {
        sireId: "sire",
        damId: "dam",
        sirePedigree: { sireId: commonAncestorId, damId: "sireDam", generation: 1 },
        damPedigree: { sireId: commonAncestorId, damId: "damDam", generation: 1 },
        generation: 0,
      };
      const pattern = detectInbreedingPattern(pedigree as any);
      expect(pattern).toBeDefined();
      expect(pattern?.ancestorId).toBe(commonAncestorId);
      expect(pattern?.sireGen).toBe(2);
      expect(pattern?.damGen).toBe(2);
    });

    it("finds the closest common ancestor when multiple exist", () => {
      const pedigree = {
        sireId: "sire",
        damId: "dam",
        sirePedigree: {
          sireId: "sireSire",
          damId: "sireDam",
          sirePedigree: { sireId: "farAncestor", generation: 2 },
          generation: 1,
        },
        damPedigree: {
          sireId: "sireSire", // 2x2 common
          damId: "damDam",
          damPedigree: { sireId: "farAncestor", generation: 2 }, // 3x3 common
          generation: 1,
        },
        generation: 0,
      };
      const pattern = detectInbreedingPattern(pedigree as any);
      expect(pattern).toBeDefined();
      expect(pattern?.ancestorId).toBe("sireSire");
    });
  });

  describe("computeAhc", () => {
    it("calculates AHC based on parent AHC and career wins", () => {
      const sire = createTestHorse({ id: "sire", careerWins: 10 });
      // Override ancestralHistoryCoefficient after creation
      sire.ancestralHistoryCoefficient = 0.5;
      const dam = createTestHorse({ id: "dam", careerWins: 5 });
      dam.ancestralHistoryCoefficient = 0.3;
      const horseMap = new Map([
        ["sire", sire],
        ["dam", dam],
      ]);
      const pedigree = { sireId: "sire", damId: "dam", generation: 0 };

      const ahc = computeAhc(pedigree as any, horseMap);
      expect(ahc).toBeGreaterThan(0);
    });

    it("adds proven sire/dam bonuses if they were successful and inbred", () => {
      const sire = createTestHorse({ id: "sire", careerWins: 5 });
      sire.coefficientOfInbreeding = 0.06;
      sire.ancestralHistoryCoefficient = 0;
      const dam = createTestHorse({ id: "dam", careerWins: 5 });
      dam.coefficientOfInbreeding = 0.06;
      dam.ancestralHistoryCoefficient = 0;
      const horseMap = new Map([
        ["sire", sire],
        ["dam", dam],
      ]);
      const pedigree = { sireId: "sire", damId: "dam", generation: 0 };

      const ahc = computeAhc(pedigree as any, horseMap);
      // winBonus: min(0.05, 10/200) = 0.05
      // provenSireBonus: 0.05
      // provenDamBonus: 0.03
      expect(ahc).toBeCloseTo(0.13, 2);
    });

    it("returns 0 if parents not found in horseMap", () => {
      const pedigree = { sireId: "sire", damId: "dam", generation: 0 };
      expect(computeAhc(pedigree as any, new Map())).toBe(0);
      expect(computeAhc(undefined, new Map())).toBe(0);
    });
  });

  describe("computeProspectiveCoi", () => {
    it("returns 0 if there are no common ancestors", () => {
      const sire = createTestHorse({
        id: "sire",
        pedigree: { sireId: "sireSire", damId: "sireDam", generation: 1, name: "Sire" } as any,
      });
      const dam = createTestHorse({
        id: "dam",
        pedigree: { sireId: "damSire", damId: "damDam", generation: 1, name: "Dam" } as any,
      });
      expect(computeProspectiveCoi(sire, dam)).toBe(0);
    });

    it("calculates a non-zero COI for a mating with a common ancestor", () => {
      const commonAncestorId = "common";
      const sire = createTestHorse({
        id: "sire",
        pedigree: {
          sireId: commonAncestorId,
          damId: "sireDam",
          generation: 1,
          name: "Sire",
        } as any,
      });
      const dam = createTestHorse({
        id: "dam",
        pedigree: {
          sireId: commonAncestorId,
          damId: "damDam",
          generation: 1,
          name: "Dam",
        } as any,
      });

      const coi = computeProspectiveCoi(sire, dam);
      // 2x2: Total depth = 1 (sire to common) + 1 (dam to common) = 2.
      // formula computes Math.pow(0.5, ds + dd + 1) = Math.pow(0.5, 3) = 0.125
      expect(coi).toBe(0.125);
    });

    it("applies lower weights for distant generations", () => {
      const commonAncestorId = "common";
      const sire = createTestHorse({
        id: "sire",
        pedigree: {
          sireId: "sireSire",
          damId: "sireDam",
          generation: 1,
          name: "Sire",
          sirePedigree: {
            sireId: "s2",
            damId: "d2",
            generation: 2,
            sirePedigree: {
              sireId: "s3",
              damId: "d3",
              generation: 3,
              sirePedigree: { sireId: commonAncestorId, damId: "d4", generation: 4 },
            },
          },
        } as any,
      });
      const dam = createTestHorse({
        id: "dam",
        pedigree: {
          sireId: "damSire",
          damId: "damDam",
          generation: 1,
          name: "Dam",
          damPedigree: {
            sireId: "s2b",
            damId: "d2b",
            generation: 2,
            sirePedigree: {
              sireId: "s3b",
              damId: "d3b",
              generation: 3,
              sirePedigree: { sireId: commonAncestorId, damId: "d4b", generation: 4 },
            },
          },
        } as any,
      });

      // depth sire = 4, depth dam = 4 -> totalDepth = 8
      // weight should be 0.25
      // base calc = Math.pow(0.5, 4 + 4 + 1) = 0.5^9 = 0.001953125
      // 0.25 * 0.001953125 = 0.00048828125
      const coi = computeProspectiveCoi(sire, dam);
      expect(coi).toBeCloseTo(0.00048828125, 6);
    });
  });

  describe("computeCoiFromSnapshot caching", () => {
    it("caches COI calculations for the same sire and dam combination", () => {
      const pedigree = {
        sireId: "sire_x",
        damId: "dam_x",
        sirePedigree: { sireId: "common", damId: "sireDam", generation: 1 },
        damPedigree: { sireId: "common", damId: "damDam", generation: 1 },
        generation: 0,
      };

      expect(getCacheStats().coi).toBe(0);

      // First calculation
      const result1 = computeCoiFromSnapshot(pedigree as any);
      expect(getCacheStats().coi).toBe(1);

      // Second calculation should hit cache (though we can't easily assert the mock inside the original file,
      // the cache size remaining 1 and identical result proves it utilizes the cache wrapper)
      const result2 = computeCoiFromSnapshot(pedigree as any);
      expect(getCacheStats().coi).toBe(1);
      expect(result1).toBe(result2);
    });
  });

  describe("resolveBloodline", () => {
    it("returns the bloodline if it is already set on the horse", () => {
      const horse = createTestHorse({ id: "bl-1", bloodline: "Storm Cat" });
      expect(resolveBloodline(horse, new Map())).toBe("Storm Cat");
    });

    it("matches foundation bloodline by horse name or sire name", () => {
      const horse1 = createTestHorse({
        id: "bl-2",
        bloodline: undefined as any,
        name: "Sadler's Wells",
      });
      const horse2 = createTestHorse({
        id: "bl-3",
        bloodline: undefined as any,
        sireName: "Galileo",
      });

      expect(resolveBloodline(horse1, new Map())).toBe("Sadler's Wells");
      expect(resolveBloodline(horse2, new Map())).toBe("Galileo");
    });

    it("traverses upwards via sireId in horseMap", () => {
      const grandSire = createTestHorse({
        id: "grandsire-1",
        bloodline: undefined as any,
        name: "A.P. Indy",
      });
      const sire = createTestHorse({
        id: "sire-1",
        bloodline: undefined as any,
        name: "Some Sire",
        pedigree: {
          sireId: "grandsire-1",
          damId: "unrelated",
          generation: 1,
          name: "Some Sire",
        } as any,
      });
      const horse = createTestHorse({
        id: "horse-1",
        bloodline: undefined as any,
        pedigree: {
          sireId: "sire-1",
          damId: "unrelated",
          generation: 0,
          name: "Test Horse",
        } as any,
      });

      const map = new Map([
        ["grandsire-1", grandSire],
        ["sire-1", sire],
      ]);

      expect(resolveBloodline(horse, map)).toBe("A.P. Indy");
    });

    it("falls back to findHorseByName if in-game pedigree breaks", () => {
      const horse = createTestHorse({
        id: "horse-2",
        bloodline: undefined as any,
        pedigree: { sireName: "Unbridled's Song", generation: 0, name: "Test Horse" } as any,
      });

      expect(resolveBloodline(horse, new Map())).toBe("Unbridled's Song");
    });

    it("returns Unaffiliated if traversal limits are reached or bloodline is unknown", () => {
      const horse = createTestHorse({
        id: "bl-5",
        bloodline: undefined as any,
        sireName: "Unknown Random Sire",
      });
      expect(resolveBloodline(horse, new Map())).toBe("Unaffiliated");
    });
  });
});
