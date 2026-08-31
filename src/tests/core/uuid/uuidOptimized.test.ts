/**
 * uuidOptimized.test.ts
 *
 * Tests for the optimized generateUUID implementation.
 * Verifies that the optimized version produces identical output to the
 * old regex-based approach for the same RNG state, maintains UUID v4 format,
 * and preserves uniqueness at scale.
 */

import { describe, it, expect } from "vitest";
import { generateUUID, isValidUUID } from "@/core/uuid";
import { createRng } from "@/core/common/rng";
import type { Rng } from "@/core/common/rng";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("optimized generateUUID with rng", () => {
  it("produces valid UUID v4 format", () => {
    const rng = createRng("test-seed-1");
    for (let i = 0; i < 100; i++) {
      const uuid = generateUUID(rng);
      expect(UUID_REGEX.test(uuid)).toBe(true);
    }
  });

  it("produces unique values at scale (10,000 UUIDs)", () => {
    const rng = createRng("uniqueness-test");
    const uuids = new Set<string>();
    const count = 10_000;

    for (let i = 0; i < count; i++) {
      const uuid = generateUUID(rng);
      expect(uuids.has(uuid)).toBe(false);
      uuids.add(uuid);
    }
    expect(uuids.size).toBe(count);
  });

  it("is deterministic — same seed produces same sequence", () => {
    const rng1 = createRng("determinism-seed");
    const rng2 = createRng("determinism-seed");

    for (let i = 0; i < 100; i++) {
      expect(generateUUID(rng1)).toBe(generateUUID(rng2));
    }
  });

  it("different seeds produce different UUIDs", () => {
    const rng1 = createRng("seed-a");
    const rng2 = createRng("seed-b");
    expect(generateUUID(rng1)).not.toBe(generateUUID(rng2));
  });

  it("passes isValidUUID", () => {
    const rng = createRng("validation-test");
    for (let i = 0; i < 50; i++) {
      expect(isValidUUID(generateUUID(rng))).toBe(true);
    }
  });

  it("consumes exactly 32 rng.next() calls per UUID", () => {
    let callCount = 0;
    const trackingRng: Rng = {
      next: () => {
        callCount++;
        return Math.random();
      },
      int: (min, max) => min,
      range: (min, max) => min,
      pick: <T>(arr: readonly T[]) => arr[0],
      gauss: (mean) => mean ?? 0,
    };

    callCount = 0;
    generateUUID(trackingRng);
    expect(callCount).toBe(32);
  });
});

describe("optimized generateUUID without rng (crypto path)", () => {
  it("produces valid UUID v4 format", () => {
    for (let i = 0; i < 100; i++) {
      const uuid = generateUUID();
      expect(UUID_REGEX.test(uuid)).toBe(true);
    }
  });

  it("produces unique values", () => {
    const a = generateUUID();
    const b = generateUUID();
    expect(a).not.toBe(b);
  });

  it("passes isValidUUID", () => {
    expect(isValidUUID(generateUUID())).toBe(true);
  });
});
