import { describe, it, expect } from "vitest";
import { buildRunner } from "@/core/race/engine/runnerBuilder";
import { generateBeyerAndRecoveryImpacts } from "@/core/race/impacts/beyerRecovery";
import { createTestHorse } from "@/tests/helpers";
import {
  STAMINA_DRAIN_DISTANCE_DIVISOR,
  STAMINA_DRAIN_BEYER_DIVISOR,
  STAMINA_DRAIN_MAX,
} from "@/constants";
import type { Race, Horse } from "@/game/types";

const BASE_STATS = { speed: 80, stamina: 80, acceleration: 80, consistency: 80, temperament: 50, conformation: 50 };
const CONDITIONS = { speedMul: 1, staminaDrainMul: 1 };

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    name: "Test",
    age: 4,
    gender: "horse",
    stats: BASE_STATS,
    energy: 100,
    form: 0,
    potential: 90,
    raceHistory: [],
    owned: true,
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    ...overrides,
  });
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 100,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

describe("fatigueMod — recoveryPoints affect topSpeed", () => {
  it("reduces topSpeed when recoveryPoints < 50", () => {
    const fatigued = mkHorse({ id: "fatigued", recoveryPoints: 40 });
    const fresh = mkHorse({ id: "fresh", recoveryPoints: 100 });

    const fatiguedRunner = buildRunner(fatigued, false, 1600, "Turf", CONDITIONS, 1);
    const freshRunner = buildRunner(fresh, false, 1600, "Turf", CONDITIONS, 1);

    expect(fatiguedRunner.topSpeed).toBeLessThan(freshRunner.topSpeed);
  });

  it("does not reduce topSpeed when recoveryPoints >= 50", () => {
    const moderate = mkHorse({ id: "moderate", recoveryPoints: 70 });
    const fresh = mkHorse({ id: "fresh2", recoveryPoints: 100 });

    const moderateRunner = buildRunner(moderate, false, 1600, "Turf", CONDITIONS, 1);
    const freshRunner = buildRunner(fresh, false, 1600, "Turf", CONDITIONS, 1);

    expect(moderateRunner.topSpeed).toBe(freshRunner.topSpeed);
  });

  it("defaults to 100 (no penalty) when recoveryPoints is undefined", () => {
    const noRecovery = mkHorse({ id: "no-recovery" });
    delete (noRecovery as any).recoveryPoints;

    const fresh = mkHorse({ id: "fresh3", recoveryPoints: 100 });

    const noRecoveryRunner = buildRunner(noRecovery, false, 1600, "Turf", CONDITIONS, 1);
    const freshRunner = buildRunner(fresh, false, 1600, "Turf", CONDITIONS, 1);

    expect(noRecoveryRunner.topSpeed).toBe(freshRunner.topSpeed);
  });
});

describe("bouncePenalty — lastBeyer spike within 28 days reduces topSpeed", () => {
  it("applies 10% penalty when lastBeyer > avgBeyer + 15 and < 28 days", () => {
    const bounced = mkHorse({
      id: "bounced",
      lastBeyer: 100,
      lastRaceDay: 80,
      raceHistory: [
        { raceId: "r0", raceName: "Old", position: 3, day: 60, beyer: 80 } as any,
      ],
    });
    const normal = mkHorse({ id: "normal" });

    const bouncedRunner = buildRunner(bounced, false, 1600, "Turf", CONDITIONS, 1, undefined, undefined, undefined, undefined, 100);
    const normalRunner = buildRunner(normal, false, 1600, "Turf", CONDITIONS, 1, undefined, undefined, undefined, undefined, 100);

    expect(bouncedRunner.topSpeed).toBeLessThan(normalRunner.topSpeed);
  });

  it("does not apply penalty when lastBeyer <= avgBeyer + 15", () => {
    const notBounced = mkHorse({
      id: "not-bounced",
      lastBeyer: 90,
      lastRaceDay: 80,
      raceHistory: [
        { raceId: "r0", raceName: "Old", position: 3, day: 60, beyer: 80 } as any,
      ],
    });
    const normal = mkHorse({ id: "normal2" });

    const notBouncedRunner = buildRunner(notBounced, false, 1600, "Turf", CONDITIONS, 1, undefined, undefined, undefined, undefined, 100);
    const normalRunner = buildRunner(normal, false, 1600, "Turf", CONDITIONS, 1, undefined, undefined, undefined, undefined, 100);

    expect(notBouncedRunner.topSpeed).toBe(normalRunner.topSpeed);
  });

  it("does not apply penalty when >= 28 days since last race", () => {
    const oldRace = mkHorse({
      id: "old-race",
      lastBeyer: 100,
      lastRaceDay: 70,
      raceHistory: [
        { raceId: "r0", raceName: "Old", position: 3, day: 50, beyer: 80 } as any,
      ],
    });
    const normal = mkHorse({ id: "normal3" });

    const oldRaceRunner = buildRunner(oldRace, false, 1600, "Turf", CONDITIONS, 1, undefined, undefined, undefined, undefined, 100);
    const normalRunner = buildRunner(normal, false, 1600, "Turf", CONDITIONS, 1, undefined, undefined, undefined, undefined, 100);

    expect(oldRaceRunner.topSpeed).toBe(normalRunner.topSpeed);
  });
});

describe("recoveryDrain — stamina drain formula via generateBeyerAndRecoveryImpacts", () => {
  it("produces a negative recoveryImpact.delta", () => {
    const horse = mkHorse({ id: "drain-test" });
    const race = mkRace({ distance: 2000 });

    const { recoveryImpact } = generateBeyerAndRecoveryImpacts(
      horse,
      1,
      90.0,
      race,
      0,
      {},
      100,
    );

    expect(recoveryImpact.delta).toBeLessThan(0);
  });

  it("caps drain at STAMINA_DRAIN_MAX (30)", () => {
    const horse = mkHorse({ id: "cap-test" });
    const race = mkRace({ distance: 5000 });

    const { recoveryImpact } = generateBeyerAndRecoveryImpacts(
      horse,
      1,
      80.0,
      race,
      0,
      {},
      100,
    );

    expect(recoveryImpact.delta).toBeGreaterThanOrEqual(-STAMINA_DRAIN_MAX);
  });

  it("drain formula uses the same constants as production", () => {
    expect(STAMINA_DRAIN_DISTANCE_DIVISOR).toBe(100);
    expect(STAMINA_DRAIN_BEYER_DIVISOR).toBe(20);
    expect(STAMINA_DRAIN_MAX).toBe(30);

    const distance = 2000;
    const adjustedBeyer = 100;
    const expectedDrain = Math.min(
      STAMINA_DRAIN_MAX,
      Math.floor(distance / STAMINA_DRAIN_DISTANCE_DIVISOR) +
        Math.floor(adjustedBeyer / STAMINA_DRAIN_BEYER_DIVISOR),
    );
    expect(expectedDrain).toBe(25);

    const distance2 = 2400;
    const adjustedBeyer2 = 120;
    const expectedDrain2 = Math.min(
      STAMINA_DRAIN_MAX,
      Math.floor(distance2 / STAMINA_DRAIN_DISTANCE_DIVISOR) +
        Math.floor(adjustedBeyer2 / STAMINA_DRAIN_BEYER_DIVISOR),
    );
    expect(expectedDrain2).toBe(30);
  });
});
