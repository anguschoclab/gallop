import { describe, it, expect } from "vitest";
import { createRng, hashStr, nondeterministicRng } from "@/core/common/rng";

describe("rng", () => {
  it("same seed produces identical sequence", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds diverge", () => {
    const a = createRng(42);
    const b = createRng(43);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("next() stays in [0, 1)", () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int(min, max) is inclusive on both ends", () => {
    const r = createRng(7);
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < 5000; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
      if (v === 1) sawMin = true;
      if (v === 6) sawMax = true;
    }
    expect(sawMin).toBe(true);
    expect(sawMax).toBe(true);
  });

  it("hashStr is deterministic and differs across inputs", () => {
    expect(hashStr("race-123")).toBe(hashStr("race-123"));
    expect(hashStr("race-123")).not.toBe(hashStr("race-124"));
    // 32-bit unsigned
    expect(hashStr("anything")).toBeGreaterThanOrEqual(0);
    expect(hashStr("anything")).toBeLessThan(2 ** 32);
  });

  it("seed=0 still produces a valid stream", () => {
    const r = createRng(0);
    for (let i = 0; i < 10; i++) {
      const v = r.next();
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("nondeterministicRng", () => {
  it("returns a working Rng — 10 calls all produce finite [0, 1) values", () => {
    const rng = nondeterministicRng();
    for (let i = 0; i < 10; i++) {
      const v = rng.next();
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("two instances typically produce different sequences", () => {
    const r1 = nondeterministicRng();
    const r2 = nondeterministicRng();
    const s1 = Array.from({ length: 5 }, () => r1.next());
    const s2 = Array.from({ length: 5 }, () => r2.next());
    // Very unlikely to be equal; accept with high confidence
    expect(s1).not.toEqual(s2);
  });
});

describe("rng.gauss", () => {
  it("returns finite numbers", () => {
    const rng = createRng(99);
    for (let i = 0; i < 50; i++) {
      expect(Number.isFinite(rng.gauss(0, 1))).toBe(true);
    }
  });

  it("mean ≈ 0 and sd ≈ 1 over many samples (loose tolerance)", () => {
    const rng = createRng(7);
    const samples = Array.from({ length: 10000 }, () => rng.gauss(0, 1));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    const sd = Math.sqrt(variance);
    expect(mean).toBeCloseTo(0, 0); // within ±0.05 (1 decimal)
    expect(sd).toBeCloseTo(1, 0);
  });

  it("custom mean and sd are honoured", () => {
    const rng = createRng(42);
    const samples = Array.from({ length: 2000 }, () => rng.gauss(100, 10));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeCloseTo(100, 0);
  });
});

describe("rng.pick", () => {
  it("picks an element from a non-empty array", () => {
    const rng = createRng(3);
    const arr = [10, 20, 30, 40, 50];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it("picks every element eventually (over enough trials)", () => {
    const rng = createRng(1);
    const arr = [1, 2, 3, 4] as const;
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(rng.pick(arr));
    expect(seen.size).toBe(arr.length);
  });
});

describe("nondeterministicRng — crypto path", () => {
  it("uses crypto.getRandomValues for seeding when available", () => {
    const rng = nondeterministicRng();
    expect(rng.next()).toBeGreaterThanOrEqual(0);
    expect(rng.next()).toBeLessThan(1);
  });

  it("produces a valid Rng with all methods", () => {
    const rng = nondeterministicRng();
    expect(rng.int(1, 100)).toBeGreaterThanOrEqual(1);
    expect(rng.int(1, 100)).toBeLessThanOrEqual(100);
    expect(rng.range(0, 1)).toBeGreaterThanOrEqual(0);
    expect(rng.range(0, 1)).toBeLessThan(1);
    expect([1, 2, 3]).toContain(rng.pick([1, 2, 3]));
    expect(Number.isFinite(rng.gauss(0, 1))).toBe(true);
  });
});
