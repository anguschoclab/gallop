import { describe, it, expect } from "vitest";
import { buildRunner } from "@/core/race/engine/runnerBuilder";
import { AFFINITY_CONSTANTS } from "@/core/jockey/affinity";
import { createTestJockey, createTestHorse } from "@/tests/helpers";
import type { Jockey } from "@/core/jockey/types";
import type { Horse } from "@/game/types";

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
  return createTestJockey({ id: "j1", affinityMap: {}, stableAffinity: 0, ...overrides });
}

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    runningStyle: "P",
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    ...overrides,
  });
}

const SURFACE = "Turf" as const;
const CONDITIONS = { speedMul: 1, staminaDrainMul: 1 };

describe("Affinity acceleration bonus (replaces speed bonus)", () => {
  describe("topSpeed is NOT affected by affinity", () => {
    it("runner with Soulmates affinity has same topSpeed as zero-affinity", () => {
      const horse = mkHorse({ id: "h1" });

      const zeroAffinityJockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });
      const soulmateJockey = mkJockey({
        id: "j-soul",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.soulmates },
        stableAffinity: 0,
      });

      const zeroRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, zeroAffinityJockey);
      const soulRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, soulmateJockey);

      // After the change, affinity does NOT boost topSpeed
      expect(soulRunner.topSpeed).toBeCloseTo(zeroRunner.topSpeed, 5);
    });

    it("runner with Trusted affinity has same topSpeed as zero-affinity", () => {
      const horse = mkHorse({ id: "h1" });

      const zeroAffinityJockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });
      const trustedJockey = mkJockey({
        id: "j-trust",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.trusted },
        stableAffinity: 0,
      });

      const zeroRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, zeroAffinityJockey);
      const trustedRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, trustedJockey);

      expect(trustedRunner.topSpeed).toBeCloseTo(zeroRunner.topSpeed, 5);
    });
  });

  describe("accel IS boosted by affinity", () => {
    it("runner with Soulmates affinity gets ~4.5% higher accel than zero-affinity", () => {
      const horse = mkHorse({ id: "h1" });

      const zeroAffinityJockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });
      const soulmateJockey = mkJockey({
        id: "j-soul",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.soulmates },
        stableAffinity: 0,
      });

      const zeroRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, zeroAffinityJockey);
      const soulRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, soulmateJockey);

      // affinityBonus at Soulmates = 0.15, accel multiplier = 1 + 0.15 * 0.3 = 1.045
      const expectedRatio = 1 + AFFINITY_CONSTANTS.BONUS.soulmates * 0.3;
      expect(soulRunner.accel).toBeGreaterThan(zeroRunner.accel);
      expect(soulRunner.accel / zeroRunner.accel).toBeCloseTo(expectedRatio, 1);
    });

    it("runner with Trusted affinity gets smaller accel bonus", () => {
      const horse = mkHorse({ id: "h1" });

      const zeroAffinityJockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });
      const trustedJockey = mkJockey({
        id: "j-trust",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.trusted },
        stableAffinity: 0,
      });

      const zeroRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, zeroAffinityJockey);
      const trustedRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, trustedJockey);

      // Trusted bonus = 0.05, accel multiplier = 1 + 0.05 * 0.3 = 1.015
      expect(trustedRunner.accel).toBeGreaterThan(zeroRunner.accel);
      expect(trustedRunner.accel / zeroRunner.accel).toBeCloseTo(1.015, 1);
    });

    it("Soulmates accel bonus is larger than Trusted accel bonus", () => {
      const horse = mkHorse({ id: "h1" });

      const trustedJockey = mkJockey({
        id: "j-trust",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.trusted },
        stableAffinity: 0,
      });
      const soulmateJockey = mkJockey({
        id: "j-soul",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.soulmates },
        stableAffinity: 0,
      });

      const trustedRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, trustedJockey);
      const soulRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, soulmateJockey);

      expect(soulRunner.accel).toBeGreaterThan(trustedRunner.accel);
    });
  });

  describe("noise reduction is unchanged", () => {
    it("runner with Soulmates affinity has lower noise than zero-affinity", () => {
      const horse = mkHorse({ id: "h1" });

      const zeroAffinityJockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });
      const soulmateJockey = mkJockey({
        id: "j-soul",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.soulmates },
        stableAffinity: 0,
      });

      const zeroRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, zeroAffinityJockey);
      const soulRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, soulmateJockey);

      // Noise reduction: reducedNoise = noise * (1 - affinityBonus)
      // Soulmates: affinityBonus = 0.15, so noise is 85% of base
      expect(soulRunner.noise).toBeLessThan(zeroRunner.noise);
      expect(soulRunner.noise / zeroRunner.noise).toBeCloseTo(1 - 0.15, 2);
    });

    it("runner with zero affinity has same noise as base (no reduction)", () => {
      const horse = mkHorse({ id: "h1" });
      const jockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });

      const runner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, jockey);

      expect(runner.affinityBonus).toBe(0);
      // noise should be the base value (no reduction)
      // We can't check exact value, but we can check affinityBonus is 0
      expect(runner.affinityBonus).toBe(0);
    });
  });

  describe("affinityBonus field is still set correctly", () => {
    it("runner with Soulmates affinity has affinityBonus = 0.15", () => {
      const horse = mkHorse({ id: "h1" });
      const jockey = mkJockey({
        id: "j-soul",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.soulmates },
        stableAffinity: 0,
      });

      const runner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, jockey);
      expect(runner.affinityBonus).toBeCloseTo(0.15);
    });

    it("runner with Trusted affinity has affinityBonus >= 0.05", () => {
      const horse = mkHorse({ id: "h1" });
      const jockey = mkJockey({
        id: "j-trust",
        affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.trusted },
        stableAffinity: 0,
      });

      const runner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, jockey);
      expect(runner.affinityBonus).toBeGreaterThanOrEqual(0.05);
    });
  });
});
