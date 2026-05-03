import { describe, it, expect } from "vitest";
import { createRng, hashStr } from "./rng";

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
