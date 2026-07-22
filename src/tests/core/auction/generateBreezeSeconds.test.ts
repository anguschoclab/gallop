import { describe, it, expect } from "vitest";
import { generateBreezeSeconds } from "@/core/auction/engine";
import { createTestHorse } from "@/tests/helpers";
import { createRng } from "@/core/common/rng";

describe("Auction Engine - generateBreezeSeconds", () => {
  it("generates fast times for elite horses (100 stats)", () => {
    const eliteHorse = createTestHorse({
      id: "elite-1",
      stats: { speed: 100, acceleration: 100, stamina: 100, temperament: 100, conformation: 100, consistency: 100 },
    });

    // Deterministic test - middle noise (noise = 0)
    const rng1 = { range: () => 0.5, next: () => 0.5 } as any;
    expect(generateBreezeSeconds(eliteHorse, rng1)).toBe(9.6);

    // Min noise (-0.15)
    const rng2 = { range: () => 0, next: () => 0 } as any;
    expect(generateBreezeSeconds(eliteHorse, rng2)).toBe(9.45);

    // Max noise (+0.15)
    const rng3 = { range: () => 1, next: () => 1 } as any;
    expect(generateBreezeSeconds(eliteHorse, rng3)).toBe(9.75);
  });

  it("generates slow times for slow horses (0 stats)", () => {
    const slowHorse = createTestHorse({
      id: "slow-1",
      stats: { speed: 0, acceleration: 0, stamina: 0, temperament: 0, conformation: 0, consistency: 0 },
    });

    const rng1 = { range: () => 0.5, next: () => 0.5 } as any;
    expect(generateBreezeSeconds(slowHorse, rng1)).toBe(11.0);
  });

  it("weights speed more than acceleration", () => {
    const speedHorse = createTestHorse({
      id: "speed-1",
      stats: { speed: 100, acceleration: 0, stamina: 50, temperament: 50, conformation: 50, consistency: 50 },
    });

    const accelHorse = createTestHorse({
      id: "accel-1",
      stats: { speed: 0, acceleration: 100, stamina: 50, temperament: 50, conformation: 50, consistency: 50 },
    });

    const rng = { range: () => 0.5, next: () => 0.5 } as any;

    const speedTime = generateBreezeSeconds(speedHorse, rng);
    const accelTime = generateBreezeSeconds(accelHorse, rng);

    expect(speedTime).toBe(10.16);
    expect(accelTime).toBe(10.44);
    expect(speedTime).toBeLessThan(accelTime);
  });

  it("uses real RNG to generate valid range of times", () => {
    const horse = createTestHorse({
      id: "avg-1",
      stats: { speed: 50, acceleration: 50, stamina: 50, temperament: 50, conformation: 50, consistency: 50 },
    });

    const rng = createRng(12345);

    for (let i = 0; i < 20; i++) {
      const time = generateBreezeSeconds(horse, rng);
      expect(time).toBeGreaterThanOrEqual(10.15);
      expect(time).toBeLessThanOrEqual(10.45);
    }
  });
});
