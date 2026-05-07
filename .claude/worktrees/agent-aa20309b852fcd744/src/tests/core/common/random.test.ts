import { describe, it, expect } from "vitest";
import {
  rand,
  rollRunningStyle,
  randomWeather,
  randomHorseName,
  randomSilk,
  randomRaceName,
} from "@/core/common/random";
import { createRng, nondeterministicRng } from "@/game/rng";

describe("rand", () => {
  it("returns integer within range", () => {
    const rng = nondeterministicRng();
    for (let i = 0; i < 100; i++) {
      const result = rand(1, 10, rng);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it("handles negative ranges", () => {
    const result = rand(-10, -1, nondeterministicRng());
    expect(result).toBeGreaterThanOrEqual(-10);
    expect(result).toBeLessThanOrEqual(-1);
  });

  it("handles same min and max", () => {
    expect(rand(5, 5, nondeterministicRng())).toBe(5);
  });
});

describe("rollRunningStyle", () => {
  it("returns valid running style", () => {
    const stats = { speed: 50, stamina: 50, acceleration: 50 };
    const result = rollRunningStyle(stats, nondeterministicRng());
    expect(["E", "EP", "P", "S"]).toContain(result);
  });

  it("front-runner bias with high speed/acceleration", () => {
    const stats = { speed: 90, stamina: 30, acceleration: 90 };
    const rng = createRng(12345);
    // With high early bias, should skew toward front-runner
    let frontRunnerCount = 0;
    for (let i = 0; i < 100; i++) {
      if (rollRunningStyle(stats, rng) === "E") frontRunnerCount++;
    }
    expect(frontRunnerCount).toBeGreaterThan(30); // Should be biased
  });

  it("closer bias with high stamina", () => {
    const stats = { speed: 30, stamina: 90, acceleration: 30 };
    const rng = createRng(12345);
    let closerCount = 0;
    for (let i = 0; i < 100; i++) {
      if (rollRunningStyle(stats, rng) === "S") closerCount++;
    }
    expect(closerCount).toBeGreaterThan(30); // Should be biased
  });
});

describe("randomWeather", () => {
  it("returns valid weather condition", () => {
    const result = randomWeather(nondeterministicRng());
    expect(["sunny", "cloudy", "rainy", "sunset", "night"]).toContain(result);
  });
});

describe("randomHorseName", () => {
  it("returns non-empty string with two words", () => {
    const name = randomHorseName(nondeterministicRng());
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(name.split(" ").length).toBe(2);
  });

  it("uses provided RNG when given", () => {
    const mockRng = createRng(0);
    const name = randomHorseName(mockRng);
    expect(name).toBeTruthy();
  });
});

describe("randomSilk", () => {
  it("returns valid color", () => {
    const silk = randomSilk(nondeterministicRng());
    expect(silk).toBeTruthy();
  });
});

describe("randomRaceName", () => {
  it("returns non-empty string with two words", () => {
    const name = randomRaceName(nondeterministicRng());
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(name.split(" ").length).toBe(2);
  });
});
