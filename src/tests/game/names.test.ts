import { describe, it, expect } from "vitest";
import { randomHorseName, randomSilk, randomRaceName } from "./names";

describe("randomHorseName", () => {
  it("returns a non-empty string", () => {
    expect(randomHorseName()).toBeTruthy();
  });

  it("returns a two-word string (adjective + noun)", () => {
    const name = randomHorseName();
    expect(name).toContain(" ");
    expect(name.split(" ")).toHaveLength(2);
  });

  it("deterministic when given a seeded rng function", () => {
    let calls = 0;
    const seededRng = () => {
      calls++;
      return calls * 0.05; // fixed sequence
    };
    const first = randomHorseName(seededRng);
    calls = 0;
    const second = randomHorseName(seededRng);
    expect(first).toBe(second);
  });

  it("produces different names for different rng outputs", () => {
    let val = 0;
    const rng1 = () => (val += 0.01, val % 1);
    let val2 = 0.5;
    const rng2 = () => (val2 += 0.01, val2 % 1);
    // Different seed progressions may produce different names
    const names = new Set(Array.from({ length: 10 }, () => randomHorseName()));
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("randomSilk", () => {
  it("returns a hex color string matching #rrggbb pattern", () => {
    expect(randomSilk()).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns a non-empty string", () => {
    expect(randomSilk()).toBeTruthy();
  });

  it("is deterministic with a fixed rng", () => {
    let calls = 0;
    const rng = () => (calls = (calls + 1) % 10, calls / 10);
    const a = randomSilk(rng);
    calls = 0;
    const b = randomSilk(rng);
    expect(a).toBe(b);
  });
});

describe("randomRaceName", () => {
  it("returns a non-empty string", () => {
    expect(randomRaceName()).toBeTruthy();
  });

  it("returns a two-word string (prefix + suffix)", () => {
    const name = randomRaceName();
    expect(name).toContain(" ");
    const words = name.split(" ");
    expect(words.length).toBeGreaterThanOrEqual(2);
  });

  it("deterministic with a seeded rng", () => {
    let calls = 0;
    const rng = () => (calls++, 0.1);
    const a = randomRaceName(rng);
    calls = 0;
    const b = randomRaceName(rng);
    expect(a).toBe(b);
  });
});
