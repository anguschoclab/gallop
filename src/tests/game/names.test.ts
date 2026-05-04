import { describe, it, expect } from "vitest";
import { randomHorseName, randomSilk, randomRaceName } from "./names";
import { createRng } from "./rng";

describe("randomHorseName", () => {
  it("returns a non-empty string", () => {
    expect(randomHorseName()).toBeTruthy();
  });

  it("returns a two-word string (adjective + noun)", () => {
    const name = randomHorseName();
    expect(name).toContain(" ");
    expect(name.split(" ")).toHaveLength(2);
  });

  it("deterministic when given a seeded rng", () => {
    const rng1 = createRng(12345);
    const rng2 = createRng(12345);
    const first = randomHorseName(rng1);
    const second = randomHorseName(rng2);
    expect(first).toBe(second);
  });
});

describe("randomSilk", () => {
  it("returns an HSL color string", () => {
    expect(randomSilk()).toMatch(/hsl\(\d+, \d+%, \d+%\)/);
  });

  it("is deterministic with a fixed rng", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const a = randomSilk(rng1);
    const b = randomSilk(rng2);
    expect(a).toBe(b);
  });
});

describe("randomRaceName", () => {
  it("returns a non-empty string", () => {
    expect(randomRaceName()).toBeTruthy();
  });

  it("deterministic with a seeded rng", () => {
    const rng1 = createRng(999);
    const rng2 = createRng(999);
    const a = randomRaceName(rng1);
    const b = randomRaceName(rng2);
    expect(a).toBe(b);
  });
});
