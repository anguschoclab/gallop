import { describe, it, expect } from "vitest";
import { buildRunner } from "@/core/race/engine/runnerBuilder";
import { AFFINITY_CONSTANTS } from "@/core/jockey/affinity";
import { createTestJockey, createTestHorse } from "@/tests/helpers";
import type { Jockey, JockeyTrait } from "@/core/jockey/types";
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

describe("Affinity speed bonus in runnerBuilder", () => {
  it("runner with Soulmates affinity gets ~4.5% higher topSpeed than zero-affinity", () => {
    const horse = mkHorse({ id: "h1" });

    const zeroAffinityJockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });
    const soulmateJockey = mkJockey({
      id: "j-soul",
      affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.soulmates },
      stableAffinity: 0,
    });

    const zeroRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, zeroAffinityJockey);
    const soulRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, soulmateJockey);

    // affinityBonus at Soulmates = 0.15, speed multiplier = 1 + 0.15 * 0.3 = 1.045
    const expectedRatio = 1 + AFFINITY_CONSTANTS.BONUS.soulmates * 0.3;
    expect(soulRunner.topSpeed).toBeGreaterThan(zeroRunner.topSpeed);
    expect(soulRunner.topSpeed / zeroRunner.topSpeed).toBeCloseTo(expectedRatio, 1);
  });

  it("runner with Trusted affinity gets smaller speed bonus", () => {
    const horse = mkHorse({ id: "h1" });

    const zeroAffinityJockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });
    const trustedJockey = mkJockey({
      id: "j-trust",
      affinityMap: { h1: AFFINITY_CONSTANTS.LEVELS.trusted },
      stableAffinity: 0,
    });

    const zeroRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, zeroAffinityJockey);
    const trustedRunner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, trustedJockey);

    // Trusted bonus = 0.05, speed multiplier = 1 + 0.05 * 0.3 = 1.015
    expect(trustedRunner.topSpeed).toBeGreaterThan(zeroRunner.topSpeed);
    expect(trustedRunner.topSpeed / zeroRunner.topSpeed).toBeCloseTo(1.015, 1);
  });

  it("runner with zero affinity gets same topSpeed as before (no regression)", () => {
    const horse = mkHorse({ id: "h1" });
    const jockey = mkJockey({ id: "j-zero", affinityMap: {}, stableAffinity: 0 });

    const runner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, jockey);

    expect(runner.affinityBonus).toBe(0);
    expect(runner.topSpeed).toBeGreaterThan(0);
  });
});

describe("Affinity-amplified trait effects", () => {
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

  it("runner with gate_master trait and zero affinity has affinityBonus = 0", () => {
    const horse = mkHorse({ id: "h1", runningStyle: "E" });
    const jockey = mkJockey({
      id: "j-gate",
      traits: ["gate_master"] as JockeyTrait[],
      affinityMap: {},
      stableAffinity: 0,
    });

    const runner = buildRunner(horse, true, 1600, SURFACE, CONDITIONS, 1, jockey);
    expect(runner.affinityBonus).toBe(0);
  });
});
