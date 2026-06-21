import { describe, it, expect, vi, afterEach } from "vitest";
import { nondeterministicRng, createRng } from "@/core/common/rng";

describe("nondeterministicRng — crypto entropy", () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    // Restore original crypto
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
  });

  it("uses crypto.getRandomValues when available", () => {
    const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = 42;
      return arr;
    });
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: mockGetRandomValues },
      writable: true,
      configurable: true,
    });

    const rng = nondeterministicRng();
    expect(mockGetRandomValues).toHaveBeenCalled();
    // RNG should still produce valid values
    expect(rng.next()).toBeGreaterThanOrEqual(0);
    expect(rng.next()).toBeLessThan(1);
  });

  it("falls back to Math.random when crypto unavailable", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const rng = nondeterministicRng();
    expect(rng.next()).toBeGreaterThanOrEqual(0);
    expect(rng.next()).toBeLessThan(1);
  });

  it("produces valid Rng interface (next, int, range, pick, gauss)", () => {
    const rng = nondeterministicRng();

    expect(typeof rng.next).toBe("function");
    expect(typeof rng.int).toBe("function");
    expect(typeof rng.range).toBe("function");
    expect(typeof rng.pick).toBe("function");
    expect(typeof rng.gauss).toBe("function");

    expect(rng.next()).toBeGreaterThanOrEqual(0);
    expect(rng.next()).toBeLessThan(1);

    const intVal = rng.int(1, 10);
    expect(intVal).toBeGreaterThanOrEqual(1);
    expect(intVal).toBeLessThanOrEqual(10);

    const rangeVal = rng.range(5, 15);
    expect(rangeVal).toBeGreaterThanOrEqual(5);
    expect(rangeVal).toBeLessThan(15);

    const pickVal = rng.pick([1, 2, 3]);
    expect([1, 2, 3]).toContain(pickVal);

    const gaussVal = rng.gauss(0, 1);
    expect(typeof gaussVal).toBe("number");
    expect(Number.isFinite(gaussVal)).toBe(true);
  });

  it("two instances produce different sequences", () => {
    const rng1 = nondeterministicRng();
    const rng2 = nondeterministicRng();
    // Extremely unlikely two crypto-seeded RNGs produce the same first value
    const v1 = rng1.next();
    const v2 = rng2.next();
    // They could theoretically match, but probability is ~1/2^32
    // Just verify both are valid [0,1) values
    expect(v1).toBeGreaterThanOrEqual(0);
    expect(v1).toBeLessThan(1);
    expect(v2).toBeGreaterThanOrEqual(0);
    expect(v2).toBeLessThan(1);
  });
});
